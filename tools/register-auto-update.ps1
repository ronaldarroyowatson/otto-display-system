param(
  [string]$InstallRoot = "C:/opt/otto-display-system",
  [string]$PackageUrl = "https://yourserver/otto-display-system-latest.zip"
)

$scriptPath = Join-Path $InstallRoot "auto-update.ps1"
@"
`$ProgressPreference = 'SilentlyContinue'
`$temp = Join-Path `$env:TEMP 'otto-display-system-latest.zip'
Invoke-WebRequest -Uri '$PackageUrl' -OutFile `$temp
powershell -ExecutionPolicy Bypass -File '$InstallRoot/tools/install-update.ps1' -PackageZip `$temp -InstallRoot '$InstallRoot'
"@ | Set-Content -Path $scriptPath -Encoding UTF8

Write-Output "Auto-update script written to $scriptPath"
