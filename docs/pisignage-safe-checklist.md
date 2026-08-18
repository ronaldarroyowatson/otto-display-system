# PiSignage Safe Checklist

- Verify target device is non-production before installation.
- Export PiSignage player and group configuration before any changes.
- Do not modify PiSignage binaries, services, or installation directory.
- Restrict Otto Display System install root to /install/otto-display-system.
- Keep PiSignage content and config directories read-only for Otto scripts.
- Validate frontend URL change is reversible.
- Confirm uninstall script leaves PiSignage packages and config intact.
- Confirm rollback script only touches /install/otto-display-system/current.
- Document every command run during test in deployment notes.
- Obtain sign-off before promoting from dev Pi to production fleet.
