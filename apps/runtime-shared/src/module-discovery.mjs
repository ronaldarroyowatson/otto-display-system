import fs from 'node:fs/promises';
import path from 'node:path';

export async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content.replace(/^\uFEFF/, ''));
}

export async function discoverModules(rootPath, configPath) {
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
    modules: discovered
  };
}
