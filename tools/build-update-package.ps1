param(
  [string]$OutputDir = "update/dist",
  [string]$Version = "0.1.0"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root $OutputDir

$commandRunner = Join-Path $root "tools/run-otto-command.mjs"
if (Test-Path $commandRunner) {
  $spaceResultRaw = node $commandRunner "file.check.space" "targetPath=$target" "minBytes=419430400"
  $spaceResult = $spaceResultRaw | ConvertFrom-Json
  if (-not $spaceResult.ok) {
    throw "Insufficient disk space at $target. Required=400MB; Available=$($spaceResult.availableBytes) bytes."
  }

  $logDir = Join-Path $root "logs"
  $activeLog = Join-Path $root "logs/update-build.log"
  node $commandRunner "file.rotate.logs" "directory=$logDir" "maxFiles=12" "maxBytes=4000000" "activeLogFile=$activeLog" | Out-Null
}

Remove-Item -Path $target -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $target -Force | Out-Null

$manifestPath = Join-Path $root "update/manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$manifest.version = $Version
$manifest.generatedAt = (Get-Date).ToString("o")
$resolvedManifestPath = Join-Path $target "manifest.json"
$manifest | ConvertTo-Json -Depth 8 | Set-Content $resolvedManifestPath -Encoding UTF8

$payloadRoot = Join-Path $target "payload"
New-Item -ItemType Directory -Path $payloadRoot -Force | Out-Null

foreach ($folderName in @("modules", "apps", "config", "schemas")) {
  $sourceFolder = Join-Path $root $folderName
  $destinationFolder = Join-Path $payloadRoot $folderName
  New-Item -ItemType Directory -Path $destinationFolder -Force | Out-Null
  & robocopy $sourceFolder $destinationFolder /E /XD node_modules .git artifacts /XF *.zip *.tgz *.tar *.gz /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Failed to stage $folderName into the update payload."
  }
}

foreach ($folderName in @(
  "external/otto/otto-command-service",
  "external/otto/otto-debug-extension",
  "external/otto/otto-kernel",
  "external/otto/otto-file-extension",
  "external/otto/otto-display-control-system",
  "external/otto/otto-design-system-dev-ui",
  "external/otto/otto-display-orchestrator",
  "external/otto/otto-extensions"
)) {
  $sourceFolder = Join-Path $root $folderName
  $destinationFolder = Join-Path $payloadRoot $folderName
  New-Item -ItemType Directory -Path $destinationFolder -Force | Out-Null
  & robocopy $sourceFolder $destinationFolder /E /XD node_modules .git artifacts /XF *.zip *.tgz *.tar *.gz /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Failed to stage $folderName into the update payload."
  }
}
Copy-Item (Join-Path $root "module-loader.config.json") (Join-Path $payloadRoot "module-loader.config.json") -Force
if (Test-Path (Join-Path $root "design-system.config.json")) {
  Copy-Item (Join-Path $root "design-system.config.json") (Join-Path $payloadRoot "design-system.config.json") -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $target "otto-display-system-$Version.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$zipFile = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -Path $payloadRoot -Recurse -File -Force | ForEach-Object {
    $relativePath = $_.FullName.Substring($payloadRoot.Length + 1) -replace '\\', '/'
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipFile, $_.FullName, $relativePath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
}
finally {
  $zipFile.Dispose()
}
Write-Output "Update package built: $zipPath"
