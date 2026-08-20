import fs from 'node:fs/promises';
import path from 'node:path';
import { executeRoutedCommand } from './command-executor.mjs';

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
}

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
          id: entry.id ?? entry.name,
          name: entry.name,
          location: entry.path,
          dependencies: entry.dependencyMetadata ?? null,
          dependencyValidation: entry.dependencyValidation ?? null
        })),
        source: 'eds',
        dependencyValidation: registry.dependencyValidation ?? null
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

export async function discoverExtensionDependencyGraph(rootPath, extensionNames) {
  try {
    const registry = await executeRoutedCommand('eds.get.registry', {
      workspaceRoot: rootPath
    });

    if (!registry || !Array.isArray(registry.extensions)) {
      throw new Error('EDS registry unavailable');
    }

    const requestedNames = Array.isArray(extensionNames) && extensionNames.length > 0
      ? new Set(extensionNames)
      : null;

    const records = registry.extensions
      .filter((entry) => !requestedNames || requestedNames.has(entry.id) || requestedNames.has(entry.name))
      .map((entry) => ({
        id: entry.id ?? entry.name,
        name: entry.name,
        path: entry.path,
        requiredExtensions: entry.dependencyMetadata?.requiredExtensions ?? [],
        optionalExtensions: entry.dependencyMetadata?.optionalExtensions ?? [],
        dependencyMetadata: entry.dependencyMetadata ?? null,
        dependencyValidation: entry.dependencyValidation ?? null
      }));

    return {
      source: 'eds',
      dependencyIndexPath: registry.dependencyIndexPath ?? null,
      dependencyIndexGeneratedAt: registry.dependencyIndexGeneratedAt ?? null,
      dependencyValidation: registry.dependencyValidation ?? null,
      requiredExtensions: [...new Set(records.flatMap((entry) => entry.requiredExtensions))].sort(),
      optionalExtensions: [...new Set(records.flatMap((entry) => entry.optionalExtensions))].sort(),
      records
    };
  } catch {
    return {
      source: 'module-loader',
      dependencyIndexPath: null,
      dependencyIndexGeneratedAt: null,
      dependencyValidation: null,
      requiredExtensions: [],
      optionalExtensions: [],
      records: []
    };
  }
}

export async function discoverRequiredExtensions(rootPath, extensionNames) {
  const dependencyGraph = await discoverExtensionDependencyGraph(rootPath, extensionNames);
  const resolved = [];
  for (const extensionName of dependencyGraph.requiredExtensions) {
    try {
      const result = await executeRoutedCommand(`eds.get.extension.${extensionName}`, {
        workspaceRoot: rootPath
      });

      resolved.push({
        name: extensionName,
        found: Boolean(result?.found),
        extension: result?.extension ?? null,
        dependencyMetadata: result?.extension?.dependencyMetadata ?? null,
        dependencyValidation: result?.extension?.dependencyValidation ?? null
      });
    } catch {
      resolved.push({
        name: extensionName,
        found: false,
        extension: null,
        dependencyMetadata: null,
        dependencyValidation: null
      });
    }
  }

  return resolved;
}
