#!/usr/bin/env node
import process from 'node:process';

import { executeRoutedCommand } from '../apps/runtime-shared/src/command-executor.mjs';

function parseScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && value.trim() !== '') {
    return numeric;
  }
  return value;
}

function parseKeyValueArgs(args) {
  const payload = {};
  for (const arg of args) {
    const [rawKey, ...rest] = arg.split('=');
    if (!rawKey || rest.length === 0) {
      continue;
    }
    payload[rawKey] = parseScalar(rest.join('='));
  }
  return payload;
}

async function main() {
  const [commandName, ...payloadArgs] = process.argv.slice(2);
  if (!commandName) {
    throw new Error('Usage: node tools/run-otto-command.mjs <command.name> [jsonPayload|key=value ...]');
  }

  let payload = {};
  if (payloadArgs.length === 1 && payloadArgs[0].trim().startsWith('{')) {
    payload = JSON.parse(payloadArgs[0]);
  } else if (payloadArgs.length > 0) {
    payload = parseKeyValueArgs(payloadArgs);
  }

  const result = await executeRoutedCommand(commandName, payload);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
