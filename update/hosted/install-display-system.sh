#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${OTTO_UPDATE_BASE_URL:-http://192.168.2.23:8090}"
INSTALL_ROOT="/opt/otto-display-system"
CURRENT_DIR="${INSTALL_ROOT}/current"
BACKUP_DIR="${INSTALL_ROOT}/backups"
PKG_URL="$SERVER_URL/otto-display-system-latest.zip"
CORE_URL="$SERVER_URL/otto-core-latest.tgz"
PI_HOSTNAME="$(hostname -s 2>/dev/null || hostname 2>/dev/null || echo otto-display)"
FRONTEND_HOST="${OTTO_FRONTEND_HOST:-${PI_HOSTNAME}.local}"
FRONTEND_SCHEME="${OTTO_FRONTEND_SCHEME:-https}"
FRONTEND_PORT="${OTTO_FRONTEND_PORT:-8080}"
FRONTEND_PATH="${OTTO_FRONTEND_PATH:-/display}"
FRONTEND_URL="${OTTO_FRONTEND_URL:-${FRONTEND_SCHEME}://${FRONTEND_HOST}:${FRONTEND_PORT}${FRONTEND_PATH}}"

# If a full frontend URL is explicitly provided, align FRONTEND_HOST to that URL.
# This keeps the generated certificate SAN entries in sync with the actual URL
# used by PiSignage players.
if [ -n "${OTTO_FRONTEND_URL:-}" ]; then
  EXPLICIT_FRONTEND_HOST="$(printf '%s' "$OTTO_FRONTEND_URL" | sed -E 's#^[a-zA-Z][a-zA-Z0-9+.-]*://([^/:]+).*$#\1#')"
  if [ -n "$EXPLICIT_FRONTEND_HOST" ] && [ "$EXPLICIT_FRONTEND_HOST" != "$OTTO_FRONTEND_URL" ]; then
    FRONTEND_HOST="$EXPLICIT_FRONTEND_HOST"
  fi
fi

WEB_ROOT="/var/www/otto-display"
HTTPS_DIR="/etc/ssl/otto"
HTTPS_CERT_BASE_NAME="${OTTO_HTTPS_CERT_BASENAME:-otto-display}"
HTTPS_KEY_PATH="${OTTO_HTTPS_KEY_PATH:-${HTTPS_DIR}/otto-display.key}"
HTTPS_CERT_PATH="${OTTO_HTTPS_CERT_PATH:-${HTTPS_DIR}/otto-display.crt}"
HTTPS_CA_PATH="${OTTO_HTTPS_CA_PATH:-${HTTPS_DIR}/otto-display-ca.crt}"
HTTPS_CA_KEY_PATH="${OTTO_HTTPS_CA_KEY_PATH:-${HTTPS_DIR}/${HTTPS_CERT_BASE_NAME}-ca.key}"
HTTPS_CA_SERIAL_PATH="${OTTO_HTTPS_CA_SERIAL_PATH:-${HTTPS_DIR}/${HTTPS_CERT_BASE_NAME}-ca.srl}"
LOCAL_CA_TRUST_PATH="/usr/local/share/ca-certificates/${HTTPS_CERT_BASE_NAME}-ca.crt"
PI_PRIMARY_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
CA_STORAGE_ROOT="/var/lib/otto-display-system/certificates"
SECRETS_ROOT="/var/lib/otto-display-system/secrets"
PISIGNAGE_SAFE_PATHS=("/home/pi/pisignage" "/var/lib/pisignage" "/etc/pisignage")
SERVICE_NAME="otto-display-system"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "Installing Otto Display System..."
mkdir -p "$CURRENT_DIR" "$BACKUP_DIR"
cd "$INSTALL_ROOT"

for path in "${PISIGNAGE_SAFE_PATHS[@]}"; do
  if [ -e "$path" ]; then
    echo "PiSignage path detected and will remain untouched: $path"
  fi
done

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required and was not found. Install Node.js first."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found; continuing because runtime payload does not require pnpm at install time."
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "unzip is required and was not found. Install unzip first."
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required and was not found. Install openssl first."
  exit 1
fi

timestamp="$(date +%Y%m%d%H%M%S)"
if [ -f "${INSTALL_ROOT}/otto-display-system.zip" ]; then
  mv "${INSTALL_ROOT}/otto-display-system.zip" "${BACKUP_DIR}/otto-display-system-${timestamp}.zip"
fi

if curl -fsSL "$CORE_URL" -o "${INSTALL_ROOT}/otto-core-latest.tgz"; then
  echo "Downloaded optional core package from $CORE_URL"
else
  echo "Optional core package not found at $CORE_URL; continuing without it."
fi
curl -fsSL "$PKG_URL" -o "${INSTALL_ROOT}/otto-display-system.zip"
rm -rf "$CURRENT_DIR"
mkdir -p "$CURRENT_DIR"
unzip -o "${INSTALL_ROOT}/otto-display-system.zip" -d "$CURRENT_DIR"

if [ -f "${CURRENT_DIR}/package.json" ] && [ -f "${CURRENT_DIR}/pnpm-lock.yaml" ]; then
  if ! command -v corepack >/dev/null 2>&1; then
    echo "corepack is required to install workspace dependencies on the Pi."
  else
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@9.12.0 --activate >/dev/null 2>&1 || true
  fi

  if command -v pnpm >/dev/null 2>&1; then
    echo "Installing workspace dependencies for Otto display runtime..."
    (cd "$CURRENT_DIR" && pnpm install --frozen-lockfile --ignore-workspace-root-check || cd "$CURRENT_DIR" && pnpm install --frozen-lockfile)
  else
    echo "pnpm not available after install; service may fail until dependencies are restored manually."
  fi
fi

if [ -d "${CURRENT_DIR}/modules/display-frontend/public" ]; then
  mkdir -p "$WEB_ROOT"
  cp -R "${CURRENT_DIR}/modules/display-frontend/public/"* "$WEB_ROOT/"
fi

mkdir -p "$CA_STORAGE_ROOT" "$SECRETS_ROOT"
mkdir -p "$HTTPS_DIR"

CERT_REQUIRES_REBUILD=0
if [ ! -f "$HTTPS_KEY_PATH" ] || [ ! -f "$HTTPS_CERT_PATH" ]; then
  CERT_REQUIRES_REBUILD=1
fi

if [ "$CERT_REQUIRES_REBUILD" -eq 0 ]; then
  if ! openssl x509 -in "$HTTPS_CERT_PATH" -noout -ext subjectAltName >/tmp/otto-cert-san.txt 2>/dev/null; then
    CERT_REQUIRES_REBUILD=1
  elif ! grep -Eq "DNS:${FRONTEND_HOST}(,|$| )" /tmp/otto-cert-san.txt; then
    CERT_REQUIRES_REBUILD=1
  elif [ -f "$HTTPS_CA_PATH" ] && ! openssl verify -CAfile "$HTTPS_CA_PATH" "$HTTPS_CERT_PATH" >/tmp/otto-cert-verify.txt 2>&1; then
    CERT_REQUIRES_REBUILD=1
  fi
fi

if [ "$CERT_REQUIRES_REBUILD" -eq 1 ]; then
  echo "Generating local CA and HTTPS certificate for ${FRONTEND_HOST}"
  CA_CONFIG_PATH="${INSTALL_ROOT}/openssl-otto-ca.cnf"
  LEAF_CONFIG_PATH="${INSTALL_ROOT}/openssl-otto-leaf.cnf"
  CSR_PATH="${INSTALL_ROOT}/otto-display.csr"

  cat > "$CA_CONFIG_PATH" <<EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_ca

[dn]
CN = Otto Display Local CA (${PI_HOSTNAME})

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true
keyUsage = critical, cRLSign, keyCertSign
EOF

  cat > "$LEAF_CONFIG_PATH" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
CN = ${FRONTEND_HOST}

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
basicConstraints = CA:FALSE
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${FRONTEND_HOST}
DNS.2 = ${PI_HOSTNAME}.local
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF
  if [ -n "$PI_PRIMARY_IP" ]; then
    printf 'IP.2 = %s\n' "$PI_PRIMARY_IP" >> "$LEAF_CONFIG_PATH"
  fi

  # Build (or rebuild) a local CA and issue a leaf server certificate from it.
  openssl req -x509 -nodes -newkey rsa:4096 \
    -keyout "$HTTPS_CA_KEY_PATH" \
    -out "$HTTPS_CA_PATH" \
    -days 3650 \
    -config "$CA_CONFIG_PATH" \
    -extensions v3_ca

  openssl req -new -nodes -newkey rsa:2048 \
    -keyout "$HTTPS_KEY_PATH" \
    -out "$CSR_PATH" \
    -config "$LEAF_CONFIG_PATH"

  openssl x509 -req \
    -in "$CSR_PATH" \
    -CA "$HTTPS_CA_PATH" \
    -CAkey "$HTTPS_CA_KEY_PATH" \
    -CAcreateserial \
    -CAserial "$HTTPS_CA_SERIAL_PATH" \
    -out "$HTTPS_CERT_PATH" \
    -days 825 \
    -sha256 \
    -extensions v3_req \
    -extfile "$LEAF_CONFIG_PATH"

  rm -f "$CA_CONFIG_PATH" "$LEAF_CONFIG_PATH" "$CSR_PATH" /tmp/otto-cert-san.txt /tmp/otto-cert-verify.txt
fi

chmod 600 "$HTTPS_KEY_PATH"
chmod 600 "$HTTPS_CA_KEY_PATH"
chmod 644 "$HTTPS_CERT_PATH" "$HTTPS_CA_PATH"

# Trust the generated local CA on the Pi itself so local browser/kiosk clients
# can validate the HTTPS endpoint without privacy interstitials.
cp "$HTTPS_CA_PATH" "$LOCAL_CA_TRUST_PATH"
if command -v update-ca-certificates >/dev/null 2>&1; then
  update-ca-certificates >/dev/null 2>&1 || true
fi

mkdir -p "${CURRENT_DIR}/config"
cat > "${CURRENT_DIR}/config/pisignage.json" <<EOF
{
  "players": [],
  "frontendUrl": "$FRONTEND_URL"
}
EOF

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Otto Display System Runtime
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${CURRENT_DIR}
Environment=OTTO_DISPLAY_HOST=0.0.0.0
Environment=OTTO_DISPLAY_PORT=8080
Environment=NODE_ENV=production
Environment=OTTO_HTTPS_KEY_PATH=${HTTPS_KEY_PATH}
Environment=OTTO_HTTPS_CERT_PATH=${HTTPS_CERT_PATH}
Environment=OTTO_HTTPS_CA_PATH=${HTTPS_CA_PATH}
Environment=OTTO_CA_STORAGE_DIR=${CA_STORAGE_ROOT}
Environment=OTTO_CA_ROTATION_INTERVAL_MS=604800000
Environment=OTTO_CERT_SECURE_STORE_PATH=${SECRETS_ROOT}/certificate-secrets.json
Environment=OTTO_DEVICE_CERT_SUBJECT=display-runtime@$(hostname)
Environment=OTTO_DEVICE_CERT_ROTATION_POLL_MS=300000
ExecStart=/usr/bin/env node apps/display-runtime/src/server.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
ReadWritePaths=${INSTALL_ROOT} /var/log/otto-display-system ${CA_STORAGE_ROOT} ${SECRETS_ROOT} ${HTTPS_DIR}
LogsDirectory=otto-display-system

[Install]
WantedBy=multi-user.target
EOF

if command -v systemctl >/dev/null 2>&1; then
  systemctl daemon-reload
  systemctl enable --now "$SERVICE_NAME"
fi

cat > "${INSTALL_ROOT}/auto-update.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
INSTALL_ROOT="${OTTO_INSTALL_ROOT:-/opt/otto-display-system}"
CURRENT_DIR="${INSTALL_ROOT}/current"
RUNNER_PATH="${OTTO_COMMAND_RUNNER:-${CURRENT_DIR}/tools/run-otto-command.mjs}"
AUTO_APPROVE_UPDATES="${OTTO_AUTO_APPROVE_UPDATES:-false}"
SERVICE_NAME="${OTTO_SERVICE_NAME:-otto-display-system}"
LEGACY_BASE_URL="${OTTO_LEGACY_UPDATE_BASE_URL:-${OTTO_UPDATE_BASE_URL:-http://192.168.2.23:8090}}"
LEGACY_MANIFEST_URL="${OTTO_UPDATE_MANIFEST_URL:-${LEGACY_BASE_URL}/manifest.json}"
LEGACY_PACKAGE_URL="${OTTO_UPDATE_PACKAGE_URL:-${LEGACY_BASE_URL}/otto-display-system-latest.zip}"
VERSION_FILE="${INSTALL_ROOT}/installed-version.txt"
AUTO_REPAIR_SCRIPTS="${OTTO_AUTO_REPAIR_SCRIPTS:-true}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run command-service update commands."
  exit 1
fi

if [ ! -f "${RUNNER_PATH}" ]; then
  echo "Command runner not found at ${RUNNER_PATH}"
  exit 1
fi

run_command() {
  local command_name="$1"
  shift
  node "${RUNNER_PATH}" "${command_name}" "$@"
}

read_manifest_version() {
  curl -fsSL "${LEGACY_MANIFEST_URL}" | node -e 'let data="";process.stdin.on("data",(chunk)=>data+=chunk);process.stdin.on("end",()=>{try{const parsed=JSON.parse(data);process.stdout.write(String(parsed.version ?? ""));}catch{process.exit(1);}});'
}

legacy_update_fallback() {
  echo "otto-update API unavailable. Falling back to manifest/package updater."

  local remote_version=""
  remote_version="$(read_manifest_version 2>/dev/null || true)"

  local local_version=""
  if [ -f "${VERSION_FILE}" ]; then
    local_version="$(cat "${VERSION_FILE}" 2>/dev/null || true)"
  fi

  if [ -n "${remote_version}" ] && [ "${remote_version}" = "${local_version}" ]; then
    echo "No update available (installed=${local_version})."
    return 0
  fi

  local package_path="${INSTALL_ROOT}/otto-display-system.zip"
  curl -fsSL "${LEGACY_PACKAGE_URL}" -o "${package_path}"

  rm -rf "${CURRENT_DIR}"
  mkdir -p "${CURRENT_DIR}"
  unzip -o "${package_path}" -d "${CURRENT_DIR}"

  if [ -n "${remote_version}" ]; then
    printf '%s\n' "${remote_version}" > "${VERSION_FILE}"
  fi

  if command -v systemctl >/dev/null 2>&1; then
    systemctl restart "${SERVICE_NAME}" >/dev/null 2>&1 || true
  fi

  echo "Fallback update applied${remote_version:+ to version ${remote_version}}."
}

extract_json_field() {
  local payload="$1"
  local field_name="$2"
  node -e 'const input = process.argv[1]; const field = process.argv[2]; try { const parsed = JSON.parse(input); const value = parsed?.[field]; if (value !== undefined && value !== null) { process.stdout.write(String(value)); } } catch { process.exit(1); }' "$payload" "$field_name"
}

echo "Checking OttoUpdate health..."
if ! run_command "update.health" >/dev/null 2>&1; then
  legacy_update_fallback
  exit 0
fi

echo "Validating install integrity and dependency health..."
preflight_result="$(run_command "update.validate.install" 2>/dev/null || true)"

# Check if auto-update.sh needs repair
if [ "${AUTO_REPAIR_SCRIPTS}" = "true" ] && echo "${preflight_result}" | grep -q '"stale_auto_update_script"'; then
  echo "Detected stale auto-update.sh script. Attempting self-repair..."
  if run_command "update.repair.auto-update-script" >/dev/null 2>&1; then
    echo "Auto-update.sh successfully repaired. Restarting update flow..."
    # Re-execute this script to use the repaired version
    exec "$0" "$@"
  else
    echo "Warning: Failed to repair auto-update.sh, continuing anyway..."
  fi
fi

echo "Triggering update.check through command-service..."
check_result="$(run_command "update.check")"
echo "update.check => ${check_result}"

if [ "${AUTO_APPROVE_UPDATES}" = "true" ]; then
  check_id="$(extract_json_field "${check_result}" "check_id" 2>/dev/null || true)"
  if [ -n "${check_id}" ]; then
    echo "Auto-approving check ${check_id}"
    approve_result="$(run_command "update.approve" "check_id=${check_id}")"
    echo "update.approve => ${approve_result}"
  fi
fi

progress_result="$(run_command "update.progress" 2>/dev/null || true)"
if [ -n "${progress_result}" ]; then
  echo "update.progress => ${progress_result}"
fi

echo "Update check flow completed through command-service."
EOF
chmod +x "${INSTALL_ROOT}/auto-update.sh"

if command -v crontab >/dev/null 2>&1; then
  (crontab -l 2>/dev/null; echo "*/15 * * * * /opt/otto-display-system/auto-update.sh >/tmp/otto-display-update.log 2>&1") | crontab -
fi

echo "Installation complete. Configure PiSignage players to load: $FRONTEND_URL"
