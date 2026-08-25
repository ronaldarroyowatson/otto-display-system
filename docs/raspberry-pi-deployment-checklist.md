# Raspberry Pi Deployment Checklist

## Target

- Development Pi: 192.168.2.179
- Deployment host URL: <http://192.168.2.23:8090>

## Preflight

- Confirm Pi SSH access is working.
- If deployment host changed, set override env vars before running scripts:
  - `export OTTO_UPDATE_BASE_URL="http://<host>:8090"`
  - `export OTTO_UPDATE_ARCHIVE_URL="http://<host>:8090/archives"` (optional)
  - `export OTTO_FRONTEND_URL="http://<host>:8080/display"` (optional)
- Confirm hosted artifacts are reachable:
  - install-display-system.sh
  - otto-display-system-latest.zip
  - otto-core-latest.tgz
- Confirm backend runtime endpoint is reachable from Pi:
  - <http://192.168.2.23:4180/health>

## Install

- Run installer on Pi:
  - `curl -s http://192.168.2.23:8090/install-display-system.sh | sudo bash`
- Verify install root:
  - `/opt/otto-display-system`
- Verify payload:
  - `/opt/otto-display-system/current/modules`
- Verify frontend config:
  - `/opt/otto-display-system/current/config/pisignage.json`

## Kiosk/Frontend

- Set PiSignage kiosk URL to configured frontend URL.
- Verify role view loads and renders.

## Backend Polling

- Validate endpoint responses from Pi:
  - `/display/hallway/current`
  - `/content/calendar.json`
  - `/content/assignments.json`

## Auto-Update

- Verify `/opt/otto-display-system/auto-update.sh` exists and is executable.
- Verify cron registration for auto-update.
- Execute auto-update once manually and verify payload refresh.

## Rollback

- Run rollback script for target version.
- Verify payload remains valid and service recovers.

## Uninstall

- Run uninstall script.
- Verify only `/opt/otto-display-system` is removed.
- Verify PiSignage state remains functional.

## PiSignage Safety

- Confirm no writes were made to:
  - `/home/pi/pisignage`
  - `/var/lib/pisignage`
  - `/etc/pisignage`
