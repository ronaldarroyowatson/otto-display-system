param(
  [string]$PackageZip,
  [string]$InstallRoot = "C:/opt/otto-display-system"
)

$ErrorActionPreference = "Stop"
if (-not $PackageZip) { throw "PackageZip is required." }

New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
Expand-Archive -Path $PackageZip -DestinationPath $InstallRoot -Force
Write-Output "Installed package at $InstallRoot"
