# Hosted Installer Smoke Test

## Date

2026-08-18

## Hosted Base URL

<http://192.168.2.23:8090>

## Objective

Run hosted installer flow and verify install artifacts, module payload availability, frontend URL config behavior, and PiSignage safety constraints.

## Command Requested

`curl -s http://192.168.2.23:8090/install-display-system.sh | bash`

## Local Host Result

- Blocked on Windows host because `bash` is not available in PATH.
- Equivalent installer content retrieval validated with:
  - `curl` GET for install script: HTTP 200
  - `curl` HEAD for package zip: HTTP 200

## Remote Smoke Execution (Pi)

- Executed via SSH on 192.168.2.179.
- Initial attempts failed due:
  - CRLF shebang mismatch (fixed by LF normalization).
  - non-root install target permission for `/opt` when piping directly to `bash` (worked with sudo-assisted flow).
- Hosted artifacts were successfully served and downloaded from the host.

## Validation Summary

- Otto core placeholder package downloaded: PASS
- Display system package downloaded: PASS
- Payload extraction under `/opt/otto-display-system/current`: PASS
- Frontend URL configuration file creation: PASS (validated in Pi phase)
- Auto-update script registration from direct installer path: PARTIAL
  - Auto-update script manually provisioned and cron entry validated in Pi phase.
- PiSignage path mutation by local smoke flow: PASS
  - No explicit writes to `/home/pi/pisignage`, `/var/lib/pisignage`, `/etc/pisignage` in installer logic.

## Notes

- Windows host lacks native `bash`, so the canonical `curl | bash` path cannot be executed locally without WSL/Git Bash.
- Live Pi run is the authoritative smoke path for shell installer behavior.
