param(
  [string]$OutputDir = "update/dist",
  [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root $OutputDir
New-Item -ItemType Directory -Path $target -Force | Out-Null

$manifestPath = Join-Path $root "update/manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$manifest.version = $Version
$manifest.generatedAt = (Get-Date).ToString("o")
$resolvedManifestPath = Join-Path $target "manifest.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content $resolvedManifestPath -Encoding UTF8

$payloadRoot = Join-Path $target "payload"
New-Item -ItemType Directory -Path $payloadRoot -Force | Out-Null

Copy-Item (Join-Path $root "modules") (Join-Path $payloadRoot "modules") -Recurse -Force
Copy-Item (Join-Path $root "config") (Join-Path $payloadRoot "config") -Recurse -Force
Copy-Item (Join-Path $root "schemas") (Join-Path $payloadRoot "schemas") -Recurse -Force
Copy-Item (Join-Path $root "module-loader.config.json") (Join-Path $payloadRoot "module-loader.config.json") -Force

$zipPath = Join-Path $target "otto-display-system-$Version.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $payloadRoot "*") -DestinationPath $zipPath
Write-Output "Update package built: $zipPath"
