#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${OTTO_UPDATE_BASE_URL:-http://192.168.2.23:8090}"
INSTALL_ROOT="/opt/otto-display-system"
CURRENT_DIR="${INSTALL_ROOT}/current"
BACKUP_DIR="${INSTALL_ROOT}/backups"
PKG_URL="$SERVER_URL/otto-display-system-latest.zip"
CORE_URL="$SERVER_URL/otto-core-latest.tgz"
PI_HOST="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [ -z "$PI_HOST" ]; then
  PI_HOST="127.0.0.1"
fi
FRONTEND_URL="${OTTO_FRONTEND_URL:-http://${PI_HOST}:8080/display}"
WEB_ROOT="/var/www/otto-display"
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

timestamp="$(date +%Y%m%d%H%M%S)"
if [ -f "${INSTALL_ROOT}/otto-display-system.zip" ]; then
  mv "${INSTALL_ROOT}/otto-display-system.zip" "${BACKUP_DIR}/otto-display-system-${timestamp}.zip"
fi

curl -fsSL "$CORE_URL" -o "${INSTALL_ROOT}/otto-core-latest.tgz"
curl -fsSL "$PKG_URL" -o "${INSTALL_ROOT}/otto-display-system.zip"
rm -rf "$CURRENT_DIR"
mkdir -p "$CURRENT_DIR"
unzip -o "${INSTALL_ROOT}/otto-display-system.zip" -d "$CURRENT_DIR"

if [ -d "${CURRENT_DIR}/modules/display-frontend/public" ]; then
  mkdir -p "$WEB_ROOT"
  cp -R "${CURRENT_DIR}/modules/display-frontend/public/"* "$WEB_ROOT/"
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
ExecStart=/usr/bin/env node apps/display-runtime/src/server.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
ReadWritePaths=${INSTALL_ROOT} /var/log/otto-display-system
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
