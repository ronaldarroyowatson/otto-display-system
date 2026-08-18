#!/usr/bin/env bash
set -euo pipefail

INSTALL_ROOT="/install/otto-display-system"
WEB_ROOT="/var/www/otto-display"
CRON_TAG="otto-display-system/auto-update.sh"

echo "Uninstalling Otto Display System from ${INSTALL_ROOT}"

if command -v crontab >/dev/null 2>&1; then
  current_cron="$(crontab -l 2>/dev/null || true)"
  if [ -n "${current_cron}" ]; then
    printf "%s\n" "${current_cron}" | grep -v "${CRON_TAG}" | crontab -
  fi
fi

rm -rf "${INSTALL_ROOT}"
rm -rf "${WEB_ROOT}"

echo "Otto Display System files removed. PiSignage installation and PiSignage config were not modified."
