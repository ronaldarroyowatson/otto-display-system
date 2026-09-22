param(
  [string]$PiHost = "3dprinterwall.local",
  [string]$PiUser = "pi",
  [string]$SshKeyPath = "$env:USERPROFILE\.ssh\otto-pi",
  [string]$RemoteCertPath = "/etc/ssl/otto/otto-display-ca.crt",
  [ValidateSet("CurrentUser", "LocalMachine")]
  [string]$StoreScope = "CurrentUser"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if ($StoreScope -eq "LocalMachine" -and -not (Test-IsAdministrator)) {
  throw "LocalMachine trust store requires an elevated PowerShell window. Re-run as Administrator or use -StoreScope CurrentUser."
}

if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
  throw "scp was not found in PATH. Install OpenSSH client and retry."
}

if (-not (Test-Path -Path $SshKeyPath)) {
  throw "SSH key not found at $SshKeyPath"
}

$storePath = if ($StoreScope -eq "LocalMachine") { "Cert:\LocalMachine\Root" } else { "Cert:\CurrentUser\Root" }
$tempDir = Join-Path $env:TEMP "otto-display-cert"
$localCertPath = Join-Path $tempDir "otto-display-ca.crt"

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "Downloading certificate from $PiUser@$PiHost..."
& scp -i $SshKeyPath -o BatchMode=yes "$PiUser@$PiHost`:$RemoteCertPath" "$localCertPath"

if (-not (Test-Path -Path $localCertPath)) {
  throw "Certificate download failed. Expected local file at $localCertPath"
}

$cert = Get-PfxCertificate -FilePath $localCertPath
$thumbprint = $cert.Thumbprint
$existing = Get-ChildItem -Path $storePath | Where-Object { $_.Thumbprint -eq $thumbprint }

if ($existing) {
  Write-Host "Certificate already trusted in $StoreScope Root store."
} else {
  Import-Certificate -FilePath $localCertPath -CertStoreLocation $storePath | Out-Null
  Write-Host "Certificate imported into $StoreScope Root store."
}

$installed = Get-ChildItem -Path $storePath | Where-Object { $_.Thumbprint -eq $thumbprint }
if (-not $installed) {
  throw "Import did not verify. Certificate with thumbprint $thumbprint not found in $storePath"
}

Write-Host ""
Write-Host "Trust configuration complete."
Write-Host "Subject    : $($cert.Subject)"
Write-Host "Thumbprint : $thumbprint"
Write-Host "Expires    : $($cert.NotAfter.ToString('u'))"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1) Close and reopen the browser window."
Write-Host "2) Open https://$PiHost`:8080/dev-ui/orchestrator-settings"
