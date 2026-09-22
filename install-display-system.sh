#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${OTTO_UPDATE_BASE_URL:-http://192.168.2.23:8090}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
WEB_ROOT="/var/www/otto-display"
HTTPS_DIR="/etc/ssl/otto"
HTTPS_KEY_PATH="${OTTO_HTTPS_KEY_PATH:-${HTTPS_DIR}/otto-display.key}"
HTTPS_CERT_PATH="${OTTO_HTTPS_CERT_PATH:-${HTTPS_DIR}/otto-display.crt}"
HTTPS_CA_PATH="${OTTO_HTTPS_CA_PATH:-${HTTPS_DIR}/otto-display-ca.crt}"
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

COMMAND_RUNNER="${SCRIPT_DIR}/tools/run-otto-command.mjs"
COMMAND_SCHEMAS="${SCRIPT_DIR}/external/otto/otto-command-service/src/schemas"
if [ -f "$COMMAND_RUNNER" ] && [ -d "$COMMAND_SCHEMAS" ]; then
  SPACE_JSON="$(node "$COMMAND_RUNNER" file.check.space "targetPath=$INSTALL_ROOT" "minBytes=600000000")"
  if [[ "$SPACE_JSON" != *'"ok":true'* ]]; then
    echo "Insufficient disk space for install at $INSTALL_ROOT"
    echo "$SPACE_JSON"
    exit 1
  fi

  node "$COMMAND_RUNNER" file.rotate.logs "directory=$INSTALL_ROOT/logs" "maxFiles=12" "maxBytes=4000000" "activeLogFile=$INSTALL_ROOT/logs/install.log" >/dev/null || true
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
  fi
fi

if [ "$CERT_REQUIRES_REBUILD" -eq 1 ]; then
  echo "Generating self-signed HTTPS certificate for ${FRONTEND_HOST}"
  CERT_CONFIG_PATH="${INSTALL_ROOT}/openssl-otto-display.cnf"
  cat > "$CERT_CONFIG_PATH" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

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
IP.1 = 127.0.0.1
EOF
  if [ -n "$PI_PRIMARY_IP" ]; then
    printf 'IP.2 = %s\n' "$PI_PRIMARY_IP" >> "$CERT_CONFIG_PATH"
  fi
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "$HTTPS_KEY_PATH" \
    -out "$HTTPS_CERT_PATH" \
    -days 3650 \
    -config "$CERT_CONFIG_PATH" \
    -extensions v3_req
  rm -f "$CERT_CONFIG_PATH" /tmp/otto-cert-san.txt
fi

if [ ! -f "$HTTPS_CA_PATH" ]; then
  cp "$HTTPS_CERT_PATH" "$HTTPS_CA_PATH"
fi

chmod 600 "$HTTPS_KEY_PATH"
chmod 644 "$HTTPS_CERT_PATH" "$HTTPS_CA_PATH"

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
ReadWritePaths=${INSTALL_ROOT} /var/log/otto-display-system ${CA_STORAGE_ROOT} ${SECRETS_ROOT} /etc/ssl/otto
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
SERVER_URL="${OTTO_UPDATE_BASE_URL:-http://192.168.2.23:8090}"
MANIFEST_URL="${OTTO_UPDATE_MANIFEST_URL:-${SERVER_URL}/manifest.json}"
INSTALL_ROOT="/opt/otto-display-system"
CURRENT_DIR="${INSTALL_ROOT}/current"
BACKUP_DIR="${INSTALL_ROOT}/backups"
PKG_URL="${OTTO_UPDATE_PACKAGE_URL:-${SERVER_URL}/otto-display-system-latest.zip}"
SERVICE_NAME="otto-display-system"
VERSION_FILE="${INSTALL_ROOT}/installed-version.txt"

read_manifest_version() {
  curl -fsSL "${MANIFEST_URL}" | node -e 'let data="";process.stdin.on("data",(chunk)=>data+=chunk);process.stdin.on("end",()=>{try{const parsed=JSON.parse(data);process.stdout.write(String(parsed.version ?? ""));}catch{process.exit(1);}});'
}

remote_version="$(read_manifest_version 2>/dev/null || true)"
local_version=""
if [ -f "${VERSION_FILE}" ]; then
  local_version="$(cat "${VERSION_FILE}" 2>/dev/null || true)"
fi

if [ -n "${remote_version}" ] && [ "${remote_version}" = "${local_version}" ]; then
  echo "No update available (installed=${local_version})."
  exit 0
fi

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y%m%d%H%M%S)"
if [ -f "${INSTALL_ROOT}/otto-display-system.zip" ]; then
  cp "${INSTALL_ROOT}/otto-display-system.zip" "${BACKUP_DIR}/otto-display-system-${timestamp}.zip"
fi

curl -fsSL "$PKG_URL" -o "${INSTALL_ROOT}/otto-display-system.zip"
rm -rf "$CURRENT_DIR"
mkdir -p "$CURRENT_DIR"
unzip -o "${INSTALL_ROOT}/otto-display-system.zip" -d "$CURRENT_DIR"

if [ -n "${remote_version}" ]; then
  printf '%s\n' "${remote_version}" > "${VERSION_FILE}"
fi

if command -v systemctl >/dev/null 2>&1; then
  systemctl restart "${SERVICE_NAME}" >/dev/null 2>&1 || true
fi

echo "Update applied${remote_version:+ to version ${remote_version}}."
EOF
chmod +x "${INSTALL_ROOT}/auto-update.sh"

if command -v crontab >/dev/null 2>&1; then
  (crontab -l 2>/dev/null; echo "*/15 * * * * /opt/otto-display-system/auto-update.sh >/tmp/otto-display-update.log 2>&1") | crontab -
fi

echo "Installation complete. Configure PiSignage players to load: $FRONTEND_URL"
