# Trusting the Otto Local Certificate on Windows

Use this once per Windows user profile to trust the Otto display HTTPS certificate.

## Fast path (recommended)

Run in PowerShell from the repo root:

```powershell
.\tools\trust-otto-ca.ps1 -PiHost 3dprinterwall.local
```

If your Pi host is not resolving yet, use the IP:

```powershell
.\tools\trust-otto-ca.ps1 -PiHost 192.168.2.181
```

The script will:

1. Download `/etc/ssl/otto/otto-display-ca.crt` from the Pi
2. Import it into your Windows Trusted Root store (CurrentUser)
3. Verify the certificate exists after import

After it completes:

1. Close and reopen your browser
2. Open `https://3dprinterwall.local:8080/dev-ui/orchestrator-settings`

## Manual path (GUI)

If script execution is restricted:

1. Download the cert from the Pi
2. Open `certmgr.msc`
3. Go to `Trusted Root Certification Authorities` > `Certificates`
4. Right-click > `All Tasks` > `Import...`
5. Select the Otto CA cert file and finish the wizard

## For support teams

- Use `-StoreScope LocalMachine` in an elevated PowerShell window to trust for all users on one PC.
- For fleet deployment, distribute the CA via Group Policy instead of manual imports.
