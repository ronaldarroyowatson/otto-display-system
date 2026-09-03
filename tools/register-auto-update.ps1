param(
  [string]$InstallRoot = "C:/opt/otto-display-system",
  [string]$UpdateBaseUrl = "http://127.0.0.1:7430",
  [switch]$AutoApprove
)

$scriptPath = Join-Path $InstallRoot "auto-update.ps1"
 $commandRunner = Join-Path $InstallRoot "current/tools/run-otto-command.mjs"
 $approveValue = if ($AutoApprove) { "true" } else { "false" }
@"
`$ProgressPreference = 'SilentlyContinue'
if (-not (Test-Path '$commandRunner')) {
  throw 'Command runner not found: $commandRunner'
}

`$env:OTTO_UPDATE_BASE_URL = '$UpdateBaseUrl'
node '$commandRunner' 'update.validate.install' | Out-Null
`$check = node '$commandRunner' 'update.check'
if ('$approveValue' -eq 'true') {
  try {
    `$parsed = `$check | ConvertFrom-Json
    if (`$parsed.check_id) {
      node '$commandRunner' 'update.approve' "check_id=`$(`$parsed.check_id)" | Out-Null
    }
  } catch {
    # Best-effort approval path; leave check result as-is if payload is non-JSON.
  }
}
"@ | Set-Content -Path $scriptPath -Encoding UTF8

Write-Output "Auto-update script written to $scriptPath"
