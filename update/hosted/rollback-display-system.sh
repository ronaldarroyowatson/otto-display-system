#!/usr/bin/env bash
set -euo pipefail

UPDATE_BASE_URL="http://192.168.2.23:8090/archives"
INSTALL_ROOT="/opt/otto-display-system"
BACKUP_ROOT="${INSTALL_ROOT}/backups"
TARGET_VERSION="${1:-}"

if [ -z "${TARGET_VERSION}" ]; then
  echo "Usage: rollback-display-system.sh <version>"
  exit 1
fi

BACKUP_FILE="${BACKUP_ROOT}/otto-display-system-${TARGET_VERSION}.zip"
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Local backup package not found, attempting hosted archive download."
  mkdir -p "${BACKUP_ROOT}"
  curl -fsSL "${UPDATE_BASE_URL}/otto-display-system-${TARGET_VERSION}.zip" -o "${BACKUP_FILE}"
fi

echo "Rolling back Otto Display System to version ${TARGET_VERSION}"
unzip -o "${BACKUP_FILE}" -d "${INSTALL_ROOT}/current"
echo "Rollback complete."
