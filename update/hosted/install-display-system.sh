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

echo "Checking OttoUpdate health..."
run_command "update.health" >/dev/null

echo "Triggering update.check through command-service..."
check_result="$(run_command "update.check")"
echo "update.check => ${check_result}"

if [ "${AUTO_APPROVE_UPDATES}" = "true" ]; then
  check_id="$(node -e 'const input = process.argv[1]; try { const parsed = JSON.parse(input); if (parsed?.check_id) process.stdout.write(String(parsed.check_id)); } catch {}' "${check_result}")"
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
