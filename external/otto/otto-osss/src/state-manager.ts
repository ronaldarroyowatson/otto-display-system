/**
 * Otto Ordered State Storage System (OSSS)
 * State Manager - core versioned storage with migration support
 * 
 * Handles safe state persistence with automatic versioning,
 * migration chains, and backup preservation for data loss prevention.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface StateVersion {
  version: string;
  timestamp: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MigrationFn {
  fromVersion: string;
  toVersion: string;
  migrate: (data: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>;
}

export class StateManager {
  private statePath: string;
  private backupDir: string;
  private currentVersion: string;
  private migrations: Map<string, MigrationFn> = new Map();
  private maxBackups: number = 10;

  constructor(
    statePath: string,
    currentVersion: string = '1.0.0',
    backupDir?: string
  ) {
    this.statePath = statePath;
    this.currentVersion = currentVersion;
    this.backupDir = backupDir || path.join(path.dirname(statePath), '.backups');
  }

  /**
   * Register a migration function for version upgrade
   */
  registerMigration(migration: MigrationFn): void {
    const key = `${migration.fromVersion}→${migration.toVersion}`;
    this.migrations.set(key, migration);
  }

  /**
   * Load state with automatic migration if needed
   */
  async load(): Promise<Record<string, any>> {
    try {
      const content = await fs.readFile(this.statePath, 'utf-8');
      const stored: StateVersion = JSON.parse(content);

      // If version matches current, return data directly
      if (stored.version === this.currentVersion) {
        return stored.data;
      }

      // Version mismatch: perform migration
      console.log(`Migrating state from ${stored.version} to ${this.currentVersion}`);
      return await this.migrateState(stored);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist yet - return empty state
        return {};
      }
      throw new Error(`Failed to load state: ${(error as Error).message}`);
    }
  }

  /**
   * Save state with automatic backup
   */
  async save(data: Record<string, any>): Promise<void> {
    try {
      // Create backup of existing state before overwrite
      await this.createBackup();

      const stateVersion: StateVersion = {
        version: this.currentVersion,
        timestamp: new Date().toISOString(),
        data,
        metadata: {
          savedAt: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'unknown'
        }
      };

      // Ensure directory exists
      await fs.mkdir(path.dirname(this.statePath), { recursive: true });

      // Write state atomically
      const tempPath = `${this.statePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(stateVersion, null, 2));
      await fs.rename(tempPath, this.statePath);

      // Cleanup old backups
      await this.cleanupBackups();
    } catch (error) {
      throw new Error(`Failed to save state: ${(error as Error).message}`);
    }
  }

  /**
   * Migrate state through version chain
   */
  private async migrateState(stored: StateVersion): Promise<Record<string, any>> {
    let currentData = stored.data;
    let currentVersion = stored.version;

    const path = this.findMigrationPath(currentVersion, this.currentVersion);
    if (!path || path.length === 0) {
      throw new Error(
        `No migration path found from ${currentVersion} to ${this.currentVersion}`
      );
    }

    for (const migration of path) {
      console.log(`Applying migration: ${migration.fromVersion} → ${migration.toVersion}`);
      try {
        currentData = await migration.migrate(currentData);
        currentVersion = migration.toVersion;
      } catch (error) {
        throw new Error(
          `Migration from ${migration.fromVersion} to ${migration.toVersion} failed: ${(error as Error).message}`
        );
      }
    }

    // Save migrated state
    await this.save(currentData);
    return currentData;
  }

  /**
   * Find chain of migrations to reach target version
   */
  private findMigrationPath(from: string, to: string): MigrationFn[] | null {
    if (from === to) return [];

    // Simple linear search (assumes migrations form a chain)
    const path: MigrationFn[] = [];
    let current = from;

    while (current !== to) {
      const key = Array.from(this.migrations.keys()).find(
        k => k.startsWith(current + '→')
      );
      if (!key) return null;

      const migration = this.migrations.get(key)!;
      path.push(migration);
      current = migration.toVersion;
    }

    return path;
  }

  /**
   * Create backup of current state
   */
  private async createBackup(): Promise<void> {
    try {
      const exists = await this.fileExists(this.statePath);
      if (!exists) return;

      await fs.mkdir(this.backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `state-${timestamp}.json`);
      await fs.copyFile(this.statePath, backupPath);
    } catch (error) {
      console.warn(`Failed to create backup: ${(error as Error).message}`);
      // Don't throw - backup failure shouldn't block save
    }
  }

  /**
   * Clean up old backups, keeping only maxBackups
   */
  private async cleanupBackups(): Promise<void> {
    try {
      const exists = await this.fileExists(this.backupDir);
      if (!exists) return;

      const files = await fs.readdir(this.backupDir);
      if (files.length > this.maxBackups) {
        // Sort by name (timestamps) and delete oldest
        const sorted = files.sort().reverse();
        for (let i = this.maxBackups; i < sorted.length; i++) {
          await fs.unlink(path.join(this.backupDir, sorted[i]));
        }
      }
    } catch (error) {
      console.warn(`Failed to cleanup backups: ${(error as Error).message}`);
    }
  }

  /**
   * Get backup history
   */
  async getBackupHistory(): Promise<string[]> {
    try {
      const exists = await this.fileExists(this.backupDir);
      if (!exists) return [];
      return (await fs.readdir(this.backupDir)).sort().reverse();
    } catch (error) {
      return [];
    }
  }

  /**
   * Restore from specific backup
   */
  async restoreFromBackup(backupFilename: string): Promise<Record<string, any>> {
    const backupPath = path.join(this.backupDir, backupFilename);
    const content = await fs.readFile(backupPath, 'utf-8');
    const backup: StateVersion = JSON.parse(content);
    return backup.data;
  }

  /**
   * Helper: check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
