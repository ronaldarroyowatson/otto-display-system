/**
 * OSSS Adapter - Node.js implementation for Otto Secure State Service
 * Follows contracts from external/otto/otto-osss
 * Provides versioned state management with backups and migrations
 */

import { promises as fs } from 'fs';
import path from 'path';

export class StateManager {
  constructor(statePath, currentVersion = '1.0.0', backupDir = null) {
    this.statePath = statePath;
    this.currentVersion = currentVersion;
    this.backupDir = backupDir || path.join(path.dirname(statePath), '.backups');
    this.migrations = new Map();
  }

  /**
   * Load state from file, applying migrations if version mismatch
   */
  async load() {
    try {
      const content = await fs.readFile(this.statePath, 'utf8');
      const stored = JSON.parse(content);

      if (stored.version !== this.currentVersion) {
        return await this.migrateState(stored);
      }

      return stored.data || stored;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { version: this.currentVersion, data: {} };
      }
      throw err;
    }
  }

  /**
   * Save state to file atomically with backup
   */
  async save(data) {
    await this.createBackup();

    const state = {
      version: this.currentVersion,
      data,
      savedAt: new Date().toISOString(),
    };

    const tmpPath = this.statePath + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    await fs.rename(tmpPath, this.statePath);
  }

  /**
   * Register a migration function
   */
  registerMigration(fromVersion, toVersion, migrateFn) {
    const key = `${fromVersion}->${toVersion}`;
    this.migrations.set(key, migrateFn);
  }

  /**
   * Create timestamped backup before write
   */
  async createBackup() {
    try {
      const content = await fs.readFile(this.statePath, 'utf8');
      await fs.mkdir(this.backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `state-${timestamp}.json`);
      await fs.writeFile(backupPath, content, 'utf8');

      // Keep only last 10 backups
      const files = await fs.readdir(this.backupDir);
      if (files.length > 10) {
        files
          .sort()
          .slice(0, -10)
          .forEach(f => fs.rm(path.join(this.backupDir, f)).catch(() => {}));
      }
    } catch (err) {
      // Backup failure is non-fatal
      console.warn('[OSSS] Backup creation failed:', err.message);
    }
  }

  /**
   * Migrate state from stored version to current version
   */
  async migrateState(stored) {
    let current = stored;
    let currentVer = stored.version || '1.0.0';

    while (currentVer !== this.currentVersion) {
      const key = `${currentVer}->${this.currentVersion}`;
      const migration = this.migrations.get(key);

      if (!migration) {
        // Try to find a path through intermediate versions
        const possibleNext = Array.from(this.migrations.keys())
          .filter(k => k.startsWith(currentVer + '->'))
          .map(k => k.split('->')[1])[0];

        if (possibleNext) {
          const nextKey = `${currentVer}->${possibleNext}`;
          const nextMigration = this.migrations.get(nextKey);
          current = await nextMigration(current);
          currentVer = possibleNext;
        } else {
          throw new Error(
            `No migration path from ${currentVer} to ${this.currentVersion}`
          );
        }
      } else {
        current = await migration(current);
        currentVer = this.currentVersion;
      }
    }

    current.version = this.currentVersion;
    return current;
  }

  /**
   * Get list of available backups
   */
  async getBackupHistory() {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(f => f.startsWith('state-') && f.endsWith('.json'))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }
}

/**
 * Migration builder for fluent API
 */
export class MigrationBuilder {
  constructor() {
    this.steps = [];
    this.from = null;
    this.to = null;
  }

  fromVersion(ver) {
    this.from = ver;
    return this;
  }

  toVersion(ver) {
    this.to = ver;
    return this;
  }

  step(transform) {
    this.steps.push(transform);
    return this;
  }

  renameKey(oldKey, newKey) {
    this.step(data => {
      if (oldKey in data) {
        data[newKey] = data[oldKey];
        delete data[oldKey];
      }
      return data;
    });
    return this;
  }

  addKey(key, defaultValue) {
    this.step(data => {
      if (!(key in data)) {
        data[key] = defaultValue;
      }
      return data;
    });
    return this;
  }

  build() {
    if (!this.from || !this.to) {
      throw new Error('Migration must have from and to versions');
    }

    return {
      from: this.from,
      to: this.to,
      migrate: async data => {
        for (const step of this.steps) {
          data = await step(data);
        }
        return data;
      },
    };
  }
}
