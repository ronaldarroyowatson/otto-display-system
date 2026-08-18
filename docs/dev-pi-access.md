# Dev Pi Access

## Scope

This document provides connection details for the development Raspberry Pi used for Otto Display System validation.

## Target Device

- Host: `192.168.2.179`
- Username: `pi`
- Password: `pi` (default dev credential used in smoke testing)

## Host Services Used During Validation

- Hosted artifacts: <http://192.168.2.23:8090>
- Runtime backend API: <http://192.168.2.23:4180>

## SSH Access

- Password auth command:
  - `ssh pi@192.168.2.179`
- Example non-interactive check:
  - `ssh pi@192.168.2.179 "hostname; uname -a"`

## Common Validation Commands

- Verify install root:
  - `ssh pi@192.168.2.179 "test -d /opt/otto-display-system && echo PRESENT || echo MISSING"`
- Verify backend polling endpoint from Pi:
  - `ssh pi@192.168.2.179 "curl -s http://192.168.2.23:4180/health"`
- Run hosted installer:
  - `ssh pi@192.168.2.179 "echo pi | sudo -S bash -c 'curl -s http://192.168.2.23:8090/install-display-system.sh | bash'"`
- Run hosted uninstall:
  - `ssh pi@192.168.2.179 "echo pi | sudo -S bash -c 'curl -s http://192.168.2.23:8090/uninstall-display-system.sh | bash'"`
- Run hosted rollback:
  - `ssh pi@192.168.2.179 "echo pi | sudo -S bash -c 'curl -s http://192.168.2.23:8090/rollback-display-system.sh | bash -s -- 0.1.0'"`

## PiSignage Safety Checks

- Validate no targeting of PiSignage directories:
  - `/home/pi/pisignage`
  - `/var/lib/pisignage`
  - `/etc/pisignage`

## Rotation Note

This is a development-only credential profile. If this Pi is moved beyond isolated dev testing, rotate credentials immediately and update this file.
