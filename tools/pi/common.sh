#!/usr/bin/env bash
set -euo pipefail

PI_HOST="${PI_HOST:-192.168.2.179}"
PI_USER="${PI_USER:-pi}"
PI_PORT="${PI_PORT:-22}"
PI_PASSWORD="${PI_PASSWORD:-pi}"

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "$cmd is required but not installed."
    exit 1
  fi
}

check_connectivity() {
  if ! ping -c 1 "$PI_HOST" >/dev/null 2>&1; then
    echo "Unable to reach Raspberry Pi at ${PI_HOST}."
    exit 1
  fi
}

pi_ssh() {
  local remote_cmd="$1"
  if command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$PI_PASSWORD" ssh -p "$PI_PORT" "$PI_USER@$PI_HOST" "$remote_cmd"
  else
    ssh -p "$PI_PORT" "$PI_USER@$PI_HOST" "$remote_cmd"
  fi
}

pi_scp() {
  local src_path="$1"
  local dest_path="$2"
  if command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$PI_PASSWORD" scp -P "$PI_PORT" -r "$src_path" "$PI_USER@$PI_HOST:$dest_path"
  else
    scp -P "$PI_PORT" -r "$src_path" "$PI_USER@$PI_HOST:$dest_path"
  fi
}
