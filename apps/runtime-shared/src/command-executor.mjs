import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const COMMAND_SERVICE_ROOT = path.join(WORKSPACE_ROOT, 'external', 'otto', 'otto-command-service', 'src');
let cachedSchemas;

async function loadSchemas() {
  if (cachedSchemas) {
    return cachedSchemas;
  }

  const schemaDir = path.join(COMMAND_SERVICE_ROOT, 'schemas');
  const files = (await fs.readdir(schemaDir)).filter((entry) => entry.endsWith('.json')).sort();
  const schemas = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(schemaDir, file), 'utf8');
    schemas.push(JSON.parse(raw));
  }

  cachedSchemas = schemas;
  return schemas;
}

async function executeRoutedCommandInternal(commandName, payload = {}, enableTrace = true) {
  let normalizedCommand = commandName;
  let normalizedPayload = payload;
  if (commandName.startsWith('eds.get.extension.') && commandName !== 'eds.get.extension.<name>') {
    normalizedCommand = 'eds.get.extension';
    normalizedPayload = {
      ...payload,
      name: commandName.slice('eds.get.extension.'.length)
    };
  }

  const schemas = await loadSchemas();
  const schema = schemas.find((entry) => entry.name === normalizedCommand);
  if (!schema) {
    throw new Error(`Unknown command: ${commandName}`);
  }

  const shouldTrace = enableTrace && !normalizedCommand.startsWith('debug.');
  if (shouldTrace) {
    try {
      await executeRoutedCommandInternal('debug.trace.command', {
          command: normalizedCommand,
        status: 'start'
      }, false);
    } catch {
      // Command routing remains functional even when tracing is unavailable.
    }
  }

  const modulePath = path.join(COMMAND_SERVICE_ROOT, 'handlers', schema.routing.handlerModule);
  const handlerModule = await import(pathToFileURL(modulePath).href);
  const handler = handlerModule[schema.routing.handlerExport];

  if (typeof handler !== 'function') {
    throw new Error(`Handler export not found for ${commandName}: ${schema.routing.handlerExport}`);
  }

  try {
    const result = await handler(normalizedPayload);
    if (shouldTrace) {
      try {
        await executeRoutedCommandInternal('debug.trace.command', {
          command: normalizedCommand,
          status: 'ok'
        }, false);
      } catch {
        // Command routing remains functional even when tracing is unavailable.
      }
    }
    return result;
  } catch (error) {
    if (shouldTrace) {
      try {
        await executeRoutedCommandInternal('debug.trace.command', {
          command: normalizedCommand,
          status: 'error',
          details: error instanceof Error ? error.message : String(error)
        }, false);
      } catch {
        // Command routing remains functional even when tracing is unavailable.
      }
    }
    throw error;
  }
}

export async function executeRoutedCommand(commandName, payload = {}) {
  return executeRoutedCommandInternal(commandName, payload, true);
}
