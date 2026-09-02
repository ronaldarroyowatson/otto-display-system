#!/usr/bin/env bash
set -euo pipefail

INSTALL_ROOT="/opt/otto-display-system"
CURRENT_DIR="${INSTALL_ROOT}/current"
BACKUP_DIR="${INSTALL_ROOT}/backups"
SERVER_URL="${OTTO_UPDATE_BASE_URL:-http://192.168.2.23:8090}"
MANIFEST_URL="${OTTO_UPDATE_MANIFEST_URL:-${SERVER_URL}/manifest.json}"
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
unzip -o "${INSTALL_ROOT}/otto-display-system.zip" -d "$CURRENT_DIR" >/dev/null

if [ -n "${remote_version}" ]; then
  printf '%s\n' "${remote_version}" > "${VERSION_FILE}"
fi

if command -v systemctl >/dev/null 2>&1; then
  systemctl restart "${SERVICE_NAME}" >/dev/null 2>&1 || true
fi

echo "Update applied${remote_version:+ to version ${remote_version}}."
