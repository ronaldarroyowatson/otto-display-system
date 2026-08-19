param(
  [string]$PackageZip,
  [string]$InstallRoot = "C:/opt/otto-display-system"
)

$ErrorActionPreference = "Stop"
if (-not $PackageZip) { throw "PackageZip is required." }

$root = Split-Path -Parent $PSScriptRoot
$commandRunner = Join-Path $root "tools/run-otto-command.mjs"
$packageBytes = (Get-Item $PackageZip).Length
$requiredBytes = [math]::Max($packageBytes * 3, 300MB)

if (Test-Path $commandRunner) {
  $spaceResultRaw = node $commandRunner "file.check.space" "targetPath=$InstallRoot" "minBytes=$requiredBytes"
  $spaceResult = $spaceResultRaw | ConvertFrom-Json
  if (-not $spaceResult.ok) {
    throw "Insufficient disk space at $InstallRoot. Required=$requiredBytes bytes; Available=$($spaceResult.availableBytes) bytes."
  }

  $logDir = Join-Path $InstallRoot "logs"
  $activeLog = Join-Path $InstallRoot "logs/install-update.log"
  node $commandRunner "file.rotate.logs" "directory=$logDir" "maxFiles=12" "maxBytes=4000000" "activeLogFile=$activeLog" | Out-Null
}

New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
Expand-Archive -Path $PackageZip -DestinationPath $InstallRoot -Force
Write-Output "Installed package at $InstallRoot"
