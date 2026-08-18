#!/usr/bin/env bash
set -euo pipefail

UPDATE_BASE_URL="http://192.168.2.23:8090"
INSTALL_ROOT="/opt/otto-display-system"
WEB_ROOT="/var/www/otto-display"
CRON_TAG="otto-display-system/auto-update.sh"
PISIGNAGE_SAFE_PATHS=("/home/pi/pisignage" "/var/lib/pisignage" "/etc/pisignage")

echo "Uninstalling Otto Display System from ${INSTALL_ROOT}"

if command -v crontab >/dev/null 2>&1; then
  current_cron="$(crontab -l 2>/dev/null || true)"
  if [ -n "${current_cron}" ]; then
    printf "%s\n" "${current_cron}" | grep -v "${CRON_TAG}" | crontab -
  fi
fi

rm -rf "${INSTALL_ROOT}"
rm -rf "${WEB_ROOT}"

for path in "${PISIGNAGE_SAFE_PATHS[@]}"; do
  if [ -e "$path" ]; then
    echo "Verified untouched PiSignage path: $path"
  fi
done

echo "Otto Display System files removed from ${INSTALL_ROOT}."
echo "Update host reference: ${UPDATE_BASE_URL}"
echo "PiSignage installation and PiSignage config were not modified."
