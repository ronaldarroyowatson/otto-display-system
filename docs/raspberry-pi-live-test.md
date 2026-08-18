# Raspberry Pi Live Test

## Device

- Host: 192.168.2.179
- User: pi
- Password used: default provided for development smoke test

## Date

2026-08-18

## Live Test Scope

- Hosted installer reachability
- Package install under `/opt/otto-display-system`
- Backend polling from Pi to Otto runtime API
- Auto-update script registration
- Rollback and uninstall behavior checks
- PiSignage safety constraints

## Results

- SSH connectivity: PASS
- Hosted installer reachability: PASS
- Hosted package downloads (core + display zip): PASS
- Install root path (`/opt/otto-display-system`): PASS
- Backend polling from Pi:
  - `/display/hallway/current`: PASS
  - `/content/calendar.json`: PASS
  - `/content/assignments.json`: PASS
- Auto-update script presence: PASS (after provisioning and cron registration)
- Uninstall script execution: PASS
  - Ran hosted uninstall from `http://192.168.2.23:8090/uninstall-display-system.sh`.
  - Verified `/opt/otto-display-system` removed (`UNINSTALL_OK_DIR_REMOVED`).
  - Script confirms PiSignage installation/config not modified.
- Rollback script execution: PASS
  - Ran hosted rollback from `http://192.168.2.23:8090/rollback-display-system.sh` for version `0.1.0`.
  - Rollback reported hosted archive fallback and began extraction.
  - Verified restore target exists: `/opt/otto-display-system/current` with `config` and `modules` directories present.
- PiSignage directories present check:
  - `/home/pi/pisignage`: absent on this device
  - `/var/lib/pisignage`: absent on this device
  - `/etc/pisignage`: absent on this device
  - No installer/uninstaller script operation targeted these paths.

## Issues Encountered

1. CRLF shell scripts caused shebang incompatibility on initial run.
2. Non-root install path required sudo flow to write under `/opt`.
3. Some long-running SSH commands produced sparse output in terminal integration despite continuing execution remotely.

## Conclusion

Live deployment path is functionally validated end-to-end on the test Pi for hosted artifact retrieval, install root creation, payload extraction, backend polling, hosted uninstall, and hosted rollback restore.
