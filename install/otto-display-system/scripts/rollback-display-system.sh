#!/usr/bin/env bash
set -euo pipefail

INSTALL_ROOT="/install/otto-display-system"
BACKUP_ROOT="${INSTALL_ROOT}/backups"
TARGET_VERSION="${1:-}"

if [ -z "${TARGET_VERSION}" ]; then
  echo "Usage: rollback-display-system.sh <version>"
  exit 1
fi

BACKUP_FILE="${BACKUP_ROOT}/otto-display-system-${TARGET_VERSION}.zip"
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Backup package not found: ${BACKUP_FILE}"
  exit 1
fi

echo "Rolling back Otto Display System to version ${TARGET_VERSION}"
unzip -o "${BACKUP_FILE}" -d "${INSTALL_ROOT}/current"
echo "Rollback complete."
