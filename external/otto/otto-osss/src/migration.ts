/**
 * Migration Utilities for OSSS
 * Common migration helpers and chainable API
 */

import type { MigrationFn } from './state-manager.js';

/**
 * Builder for creating migrations with chainable API
 */
export class MigrationBuilder {
  private steps: Array<(data: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>> = [];
  private from: string = '';
  private to: string = '';

  fromVersion(version: string): this {
    this.from = version;
    return this;
  }

  toVersion(version: string): this {
    this.to = version;
    return this;
  }

  /**
   * Add a transformation step
   */
  step(
    transform: (data: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>
  ): this {
    this.steps.push(transform);
    return this;
  }

  /**
   * Rename a top-level key
   */
  renameKey(oldKey: string, newKey: string): this {
    this.steps.push((data) => {
      if (oldKey in data) {
        data[newKey] = data[oldKey];
        delete data[oldKey];
      }
      return data;
    });
    return this;
  }

  /**
   * Add a new key with default value
   */
  addKey(key: string, defaultValue: any): this {
    this.steps.push((data) => {
      if (!(key in data)) {
        data[key] = defaultValue;
      }
      return data;
    });
    return this;
  }

  /**
   * Transform nested path value
   */
  transformPath(
    path: string,
    transform: (value: any) => any
  ): this {
    this.steps.push((data) => {
      const keys = path.split('.');
      let current = data;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) return data;
        current = current[keys[i]];
      }
      const lastKey = keys[keys.length - 1];
      if (lastKey in current) {
        current[lastKey] = transform(current[lastKey]);
      }
      return data;
    });
    return this;
  }

  /**
   * Build the migration function
   */
  build(): MigrationFn {
    if (!this.from || !this.to) {
      throw new Error('Both fromVersion and toVersion must be set');
    }

    return {
      fromVersion: this.from,
      toVersion: this.to,
      migrate: async (data) => {
        let result = { ...data };
        for (const step of this.steps) {
          result = await Promise.resolve(step(result));
        }
        return result;
      }
    };
  }
}

/**
 * Convenience function for simple migrations
 */
export function createMigration(
  fromVersion: string,
  toVersion: string,
  migrate: (data: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>
): MigrationFn {
  return { fromVersion, toVersion, migrate };
}
