#!/usr/bin/env bash
set -euo pipefail

INSTALL_ROOT="/opt/otto-display-system"
CURRENT_DIR="${INSTALL_ROOT}/current"
BACKUP_DIR="${INSTALL_ROOT}/backups"
PKG_URL="http://192.168.2.23:8090/otto-display-system-latest.zip"

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y%m%d%H%M%S)"
if [ -f "${INSTALL_ROOT}/otto-display-system.zip" ]; then
  cp "${INSTALL_ROOT}/otto-display-system.zip" "${BACKUP_DIR}/otto-display-system-${timestamp}.zip"
fi

curl -fsSL "$PKG_URL" -o "${INSTALL_ROOT}/otto-display-system.zip"
rm -rf "$CURRENT_DIR"
mkdir -p "$CURRENT_DIR"
unzip -o "${INSTALL_ROOT}/otto-display-system.zip" -d "$CURRENT_DIR" >/dev/null
