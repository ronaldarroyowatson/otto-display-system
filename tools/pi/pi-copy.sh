#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

SRC_PATH="${1:-}"
DEST_PATH="${2:-/tmp/otto-display-system-transfer}"

if [ -z "$SRC_PATH" ]; then
  echo "Usage: pi-copy.sh <source> [destination]"
  exit 1
fi

require_command scp

if [ ! -e "$SRC_PATH" ]; then
  echo "Source path does not exist: $SRC_PATH"
  exit 1
fi

check_connectivity

echo "Copying ${SRC_PATH} -> ${PI_USER}@${PI_HOST}:${DEST_PATH}"
pi_scp "$SRC_PATH" "$DEST_PATH"
