#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

REMOTE_ROOT="/opt/otto-display-system"

require_command ssh
check_connectivity

pi_ssh "set -euo pipefail; if [ -f '${REMOTE_ROOT}/install.log' ]; then tail -n 200 '${REMOTE_ROOT}/install.log'; else echo 'No install.log found under ${REMOTE_ROOT}'; fi; if [ -f /tmp/otto-display-update.log ]; then echo '--- auto-update log ---'; tail -n 200 /tmp/otto-display-update.log; fi"
