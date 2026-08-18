#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { discoverModules } from '../../runtime-shared/src/module-discovery.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DEFAULT_API_BASE = process.env.OTTO_API_BASE ?? 'http://127.0.0.1:4180';

function printHelp() {
  const lines = [
    'Otto CLI (display runtime)',
    '',
    'Usage:',
    '  otto --help',
    '  otto modules list [--config <path>]',
    '  otto display current <role>',
    '  otto calendar refresh',
    '  otto assignments import <file>',
    '',
    'Environment:',
    '  OTTO_API_BASE  Base URL for API calls (default: http://127.0.0.1:4180)'
  ];
  console.log(lines.join('\n'));
}

async function listModules(configPathArg) {
  const configPath = configPathArg
    ? path.resolve(process.cwd(), configPathArg)
    : path.join(ROOT, 'module-loader.config.json');
  const discovered = await discoverModules(ROOT, configPath);
  console.log(JSON.stringify(discovered, null, 2));
}

async function fetchJson(endpointPath) {
  const response = await fetch(`${DEFAULT_API_BASE}${endpointPath}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === 'help') {
    printHelp();
    return;
  }

  if (args[0] === 'modules' && args[1] === 'list') {
    const configFlag = args.indexOf('--config');
    const configPathArg = configFlag >= 0 ? args[configFlag + 1] : undefined;
    await listModules(configPathArg);
    return;
  }

  if (args[0] === 'display' && args[1] === 'current' && args[2]) {
    const payload = await fetchJson(`/display/${args[2]}/current`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args[0] === 'calendar' && args[1] === 'refresh') {
    const payload = await fetchJson('/content/calendar.json');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args[0] === 'assignments' && args[1] === 'import' && args[2]) {
    const payload = await fetchJson('/content/assignments.json');
    console.log(JSON.stringify({
      inputFile: path.resolve(process.cwd(), args[2]),
      result: payload
    }, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${args.join(' ')}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
