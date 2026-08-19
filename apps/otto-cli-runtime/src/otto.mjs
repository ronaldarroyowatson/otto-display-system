#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { executeRoutedCommand } from '../../runtime-shared/src/command-executor.mjs';
import { discoverModules } from '../../runtime-shared/src/module-discovery.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
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
    '  otto eds registry',
    '  otto eds extension <name>',
    '  otto debug last',
    '  otto debug trace <command>',
    '  otto debug snapshot',
    '',
    'Environment:',
    '  OTTO_API_BASE  Base URL for API calls (legacy, no longer required for routed commands)'
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
    const payload = await executeRoutedCommand('display.current', { role: args[2] });
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args[0] === 'calendar' && args[1] === 'refresh') {
    const payload = await executeRoutedCommand('calendar.refresh');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args[0] === 'assignments' && args[1] === 'import' && args[2]) {
    const payload = await executeRoutedCommand('assignments.import', { file: path.resolve(process.cwd(), args[2]) });
    console.log(JSON.stringify({
      inputFile: path.resolve(process.cwd(), args[2]),
      result: payload
    }, null, 2));
    return;
  }

  if (args[0] === 'eds' && args[1] === 'registry') {
    const payload = await executeRoutedCommand('eds.get.registry', { workspaceRoot: ROOT });
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args[0] === 'eds' && args[1] === 'extension' && args[2]) {
    const payload = await executeRoutedCommand(`eds.get.extension.${args[2]}`, {
      workspaceRoot: ROOT
    });
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args[0] === 'debug' && args[1] === 'last') {
    const payload = await executeRoutedCommand('debug.report.last-run');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args[0] === 'debug' && args[1] === 'trace' && args[2]) {
    const payload = await executeRoutedCommand('debug.trace.command', {
      command: args.slice(2).join(' '),
      status: 'ok',
      verbose: true
    });
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (args[0] === 'debug' && args[1] === 'snapshot') {
    const payload = await executeRoutedCommand('debug.snapshot.system', {
      includeMemory: true,
      includeEnv: true
    });
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${args.join(' ')}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
