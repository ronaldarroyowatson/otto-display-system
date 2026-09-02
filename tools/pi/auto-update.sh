#!/usr/bin/env bash
set -euo pipefail

INSTALL_ROOT="${OTTO_INSTALL_ROOT:-/opt/otto-display-system}"
CURRENT_DIR="${INSTALL_ROOT}/current"
RUNNER_PATH="${OTTO_COMMAND_RUNNER:-${CURRENT_DIR}/tools/run-otto-command.mjs}"
AUTO_APPROVE_UPDATES="${OTTO_AUTO_APPROVE_UPDATES:-false}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run command-service update commands."
  exit 1
fi

if [ ! -f "${RUNNER_PATH}" ]; then
  echo "Command runner not found at ${RUNNER_PATH}"
  exit 1
fi

run_command() {
  local command_name="$1"
  shift
  node "${RUNNER_PATH}" "${command_name}" "$@"
}

extract_json_field() {
  local payload="$1"
  local field_name="$2"
  node -e 'const input = process.argv[1]; const field = process.argv[2]; try { const parsed = JSON.parse(input); const value = parsed?.[field]; if (value !== undefined && value !== null) { process.stdout.write(String(value)); } } catch { process.exit(1); }' "$payload" "$field_name"
}

echo "Checking OttoUpdate health..."
run_command "update.health" >/dev/null

echo "Triggering update.check through command-service..."
check_result="$(run_command "update.check")"
echo "update.check => ${check_result}"

if [ "${AUTO_APPROVE_UPDATES}" = "true" ]; then
  check_id="$(extract_json_field "${check_result}" "check_id" 2>/dev/null || true)"
  if [ -n "${check_id}" ]; then
    echo "Auto-approving check ${check_id}"
    approve_result="$(run_command "update.approve" "check_id=${check_id}")"
    echo "update.approve => ${approve_result}"
  fi
fi

progress_result="$(run_command "update.progress" 2>/dev/null || true)"
if [ -n "${progress_result}" ]; then
  echo "update.progress => ${progress_result}"
fi

echo "Update check flow completed through command-service."
