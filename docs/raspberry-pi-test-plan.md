# Raspberry Pi Live Test Plan

## Scope
Validate Otto Display System on one development Raspberry Pi without disrupting production PiSignage devices.

## Environment
- Device: one non-production Raspberry Pi configured for kiosk display.
- Network: same VLAN/subnet as Otto API host.
- Access: SSH admin access and physical display attached.

## Steps
1. Select one Pi for development testing and verify PiSignage is currently healthy.
2. Snapshot baseline:
   - PiSignage player config export.
   - Existing kiosk URL and startup services.
3. Install Otto Display System using one-line installer.
4. Verify installer created /install/otto-display-system/current and auto-update job.
5. Set kiosk URL to Otto frontend and reboot.
6. Verify kiosk mode loads frontend and role-specific layout.
7. Verify backend polling:
   - /display/hallway/current
   - /content/calendar.json
   - /content/assignments.json
8. Trigger update package deployment and verify auto-update applies package.
9. Run uninstall script and verify PiSignage remains installed.
10. Run rollback script to previous package and verify system recovers.

## Exit Criteria
- Frontend continuously renders and refresh loop runs.
- API endpoints return HTTP 200 with valid JSON payloads.
- Auto-update applies without manual intervention.
- Uninstall removes only Otto Display System files.
- Rollback restores prior Otto Display System package.
