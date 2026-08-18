#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

REMOTE_ROOT="/opt/otto-display-system"

require_command ssh
check_connectivity

echo "Resetting Otto Display System directory on ${PI_HOST}: ${REMOTE_ROOT}"
pi_ssh "set -euo pipefail; sudo rm -rf '${REMOTE_ROOT}'; sudo mkdir -p '${REMOTE_ROOT}'; sudo chown -R ${PI_USER}:${PI_USER} '${REMOTE_ROOT}'"
