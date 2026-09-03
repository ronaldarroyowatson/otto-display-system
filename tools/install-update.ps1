param(
  [string]$PackageZip,
  [string]$InstallRoot = "C:/opt/otto-display-system",
  [switch]$AutoApprove
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$commandRunner = Join-Path $root "tools/run-otto-command.mjs"
$requiredBytes = 300MB
if ($PackageZip -and (Test-Path $PackageZip)) {
  $packageBytes = (Get-Item $PackageZip).Length
  $requiredBytes = [math]::Max($packageBytes * 3, 300MB)
}

if (Test-Path $commandRunner) {
  $spaceResultRaw = node $commandRunner "file.check.space" "targetPath=$InstallRoot" "minBytes=$requiredBytes"
  $spaceResult = $spaceResultRaw | ConvertFrom-Json
  if (-not $spaceResult.ok) {
    throw "Insufficient disk space at $InstallRoot. Required=$requiredBytes bytes; Available=$($spaceResult.availableBytes) bytes."
  }

  $logDir = Join-Path $InstallRoot "logs"
  $activeLog = Join-Path $InstallRoot "logs/install-update.log"
  node $commandRunner "file.rotate.logs" "directory=$logDir" "maxFiles=12" "maxBytes=4000000" "activeLogFile=$activeLog" | Out-Null

  node $commandRunner "update.validate.install" | Out-Null

  # Preferred DRY path: all update orchestration through command-service registry.
  $checkResultRaw = node $commandRunner "update.check"
  if ($AutoApprove) {
    try {
      $checkResult = $checkResultRaw | ConvertFrom-Json
      if ($checkResult.check_id) {
        node $commandRunner "update.approve" "check_id=$($checkResult.check_id)" | Out-Null
      }
    } catch {
      Write-Warning "Failed to auto-approve update check payload: $($_.Exception.Message)"
    }
  }

  Write-Output "Triggered update flow through command-service registry."
  return
}

if (-not $PackageZip) { throw "PackageZip is required when command runner is unavailable." }

New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
Expand-Archive -Path $PackageZip -DestinationPath $InstallRoot -Force
Write-Output "Installed package at $InstallRoot"
