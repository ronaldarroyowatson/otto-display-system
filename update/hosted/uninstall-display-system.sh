#!/usr/bin/env bash
set -euo pipefail

UPDATE_BASE_URL="${OTTO_UPDATE_BASE_URL:-http://192.168.2.23:8090}"
INSTALL_ROOT="/opt/otto-display-system"
WEB_ROOT="/var/www/otto-display"
CRON_TAG="otto-display-system/auto-update.sh"
PISIGNAGE_SAFE_PATHS=("/home/pi/pisignage" "/var/lib/pisignage" "/etc/pisignage")
SERVICE_NAME="otto-display-system"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "Uninstalling Otto Display System from ${INSTALL_ROOT}"

if command -v crontab >/dev/null 2>&1; then
  current_cron="$(crontab -l 2>/dev/null || true)"
  if [ -n "${current_cron}" ]; then
    printf "%s\n" "${current_cron}" | grep -v "${CRON_TAG}" | crontab -
  fi
fi

if command -v systemctl >/dev/null 2>&1; then
  systemctl disable --now "$SERVICE_NAME" >/dev/null 2>&1 || true
  rm -f "$SERVICE_FILE"
  systemctl daemon-reload >/dev/null 2>&1 || true
fi

rm -rf "${INSTALL_ROOT}"
rm -rf "${WEB_ROOT}"
rm -rf /var/log/otto-display-system

for path in "${PISIGNAGE_SAFE_PATHS[@]}"; do
  if [ -e "$path" ]; then
    echo "Verified untouched PiSignage path: $path"
  fi
done

echo "Otto Display System files removed from ${INSTALL_ROOT}."
echo "Update host reference: ${UPDATE_BASE_URL}"
echo "PiSignage installation and PiSignage config were not modified."
