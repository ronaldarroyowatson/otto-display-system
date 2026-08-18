#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="https://updates.otto-display-system.io"
INSTALL_ROOT="/install/otto-display-system"
CURRENT_DIR="${INSTALL_ROOT}/current"
BACKUP_DIR="${INSTALL_ROOT}/backups"
PKG_URL="$SERVER_URL/otto-display-system-latest.zip"
CORE_URL="$SERVER_URL/otto-core-latest.tgz"
FRONTEND_URL="$SERVER_URL/display/index.html"
WEB_ROOT="/var/www/otto-display"

echo "Installing Otto Display System..."
mkdir -p "$CURRENT_DIR" "$BACKUP_DIR"
cd "$INSTALL_ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required and was not found. Install Node.js first."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found, attempting corepack activation"
  corepack enable || true
  corepack prepare pnpm@9.12.0 --activate || true
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

cat > "${INSTALL_ROOT}/auto-update.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
INSTALL_ROOT="/install/otto-display-system"
CURRENT_DIR="${INSTALL_ROOT}/current"
BACKUP_DIR="${INSTALL_ROOT}/backups"
PKG_URL="https://updates.otto-display-system.io/otto-display-system-latest.zip"

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y%m%d%H%M%S)"
if [ -f "${INSTALL_ROOT}/otto-display-system.zip" ]; then
  cp "${INSTALL_ROOT}/otto-display-system.zip" "${BACKUP_DIR}/otto-display-system-${timestamp}.zip"
fi

curl -fsSL "$PKG_URL" -o "${INSTALL_ROOT}/otto-display-system.zip"
rm -rf "$CURRENT_DIR"
mkdir -p "$CURRENT_DIR"
unzip -o "${INSTALL_ROOT}/otto-display-system.zip" -d "$CURRENT_DIR"
EOF
chmod +x "${INSTALL_ROOT}/auto-update.sh"

if command -v crontab >/dev/null 2>&1; then
  (crontab -l 2>/dev/null; echo "*/15 * * * * /install/otto-display-system/auto-update.sh >/tmp/otto-display-update.log 2>&1") | crontab -
fi

echo "Installation complete. Configure PiSignage players to load: $FRONTEND_URL"
