#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

require_command ssh
check_connectivity

echo "Connecting to ${PI_USER}@${PI_HOST}:${PI_PORT}"
if command -v sshpass >/dev/null 2>&1; then
  sshpass -p "$PI_PASSWORD" ssh -p "$PI_PORT" "${PI_USER}@${PI_HOST}"
else
  ssh -p "$PI_PORT" "${PI_USER}@${PI_HOST}"
fi
