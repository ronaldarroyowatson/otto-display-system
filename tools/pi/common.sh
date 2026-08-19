#!/usr/bin/env bash
set -euo pipefail

PI_HOST="${PI_HOST:-192.168.2.179}"
PI_USER="${PI_USER:-pi}"
PI_PORT="${PI_PORT:-22}"
PI_PASSWORD="${PI_PASSWORD:-pi}"
PI_KEY_PATH="${PI_KEY_PATH:-${HOME:-}/.ssh/otto-pi}"

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

build_ssh_base_args() {
  local args=()

  if [ -n "${PI_KEY_PATH:-}" ] && [ -f "$PI_KEY_PATH" ]; then
    args+=( -i "$PI_KEY_PATH" -o IdentitiesOnly=yes )
  fi

  args+=( -p "$PI_PORT" )

  printf '%s\n' "${args[@]}"
}

pi_ssh() {
  local remote_cmd="$1"
  local ssh_args=()
  mapfile -t ssh_args < <(build_ssh_base_args)

  if command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$PI_PASSWORD" ssh "${ssh_args[@]}" "$PI_USER@$PI_HOST" "$remote_cmd"
  else
    ssh "${ssh_args[@]}" "$PI_USER@$PI_HOST" "$remote_cmd"
  fi
}

pi_scp() {
  local src_path="$1"
  local dest_path="$2"
  local scp_args=()
  mapfile -t scp_args < <(build_ssh_base_args)

  if command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$PI_PASSWORD" scp "${scp_args[@]}" -r "$src_path" "$PI_USER@$PI_HOST:$dest_path"
  else
    scp "${scp_args[@]}" -r "$src_path" "$PI_USER@$PI_HOST:$dest_path"
  fi
}
