import fs from 'node:fs/promises';
import path from 'node:path';
import { executeRoutedCommand } from './command-executor.mjs';

export async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content.replace(/^\uFEFF/, ''));
}

export async function discoverModules(rootPath, configPath) {
  try {
    const registry = await executeRoutedCommand('eds.get.registry', {
      workspaceRoot: rootPath
    });

    if (registry && Array.isArray(registry.extensions)) {
      return {
        configPath,
        moduleCount: registry.extensions.length,
        modules: registry.extensions.map((entry) => ({
          id: entry.name,
          location: entry.path
        })),
        source: 'eds'
      };
    }
  } catch {
    // Fall back to static loader-config scanning if EDS is unavailable.
  }

  const loaderConfig = await readJson(configPath);
  const searchPaths = loaderConfig.moduleSearchPaths ?? [];
  const discovered = [];

  for (const rel of searchPaths) {
    const base = path.resolve(rootPath, rel);
    let entries = [];
    try {
      entries = await fs.readdir(base, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const pkgPath = path.join(base, entry.name, 'package.json');
      try {
        const pkg = await readJson(pkgPath);
        discovered.push({
          id: pkg.name ?? entry.name,
          location: path.relative(rootPath, path.dirname(pkgPath)).replace(/\\/g, '/')
        });
      } catch {
        continue;
      }
    }
  }

  return {
    configPath,
    moduleCount: discovered.length,
    modules: discovered,
    source: 'module-loader'
  };
}

export async function discoverRequiredExtensions(rootPath, extensionNames) {
  const resolved = [];
  for (const extensionName of extensionNames) {
    try {
      const result = await executeRoutedCommand(`eds.get.extension.${extensionName}`, {
        workspaceRoot: rootPath
      });

      resolved.push({
        name: extensionName,
        found: Boolean(result?.found),
        extension: result?.extension ?? null
      });
    } catch {
      resolved.push({
        name: extensionName,
        found: false,
        extension: null
      });
    }
  }

  return resolved;
}
