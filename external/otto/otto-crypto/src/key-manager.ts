/**
 * Key Manager - manages encryption keys securely
 * 
 * Supports loading keys from environment variables or files
 * Never logs key material
 */

import fs from 'node:fs/promises';
import path from 'node:path';

export interface KeyConfig {
  source: 'env' | 'file' | 'inline';
  envVarName?: string;  // for env source
  filePath?: string;    // for file source
  keyValue?: string;    // for inline source (NOT RECOMMENDED)
}

export class KeyManager {
  private cache: Map<string, string> = new Map();
  private configs: Map<string, KeyConfig> = new Map();

  /**
   * Register a key with its configuration
   * Never passes key directly - only config
   */
  registerKey(keyName: string, config: KeyConfig): void {
    if (config.source === 'inline' && config.keyValue) {
      console.warn(
        `Registering inline key '${keyName}' - consider using env or file source instead`
      );
    }
    this.configs.set(keyName, config);
  }

  /**
   * Get a registered key
   */
  async getKey(keyName: string): Promise<string> {
    // Check cache first
    if (this.cache.has(keyName)) {
      return this.cache.get(keyName)!;
    }

    const config = this.configs.get(keyName);
    if (!config) {
      throw new Error(`Key not registered: ${keyName}`);
    }

    let keyValue: string | undefined;

    switch (config.source) {
      case 'env':
        if (!config.envVarName) {
          throw new Error(`Missing envVarName for env source: ${keyName}`);
        }
        keyValue = process.env[config.envVarName];
        if (!keyValue) {
          throw new Error(`Environment variable not set: ${config.envVarName}`);
        }
        break;

      case 'file':
        if (!config.filePath) {
          throw new Error(`Missing filePath for file source: ${keyName}`);
        }
        keyValue = await this.readKeyFile(config.filePath);
        break;

      case 'inline':
        keyValue = config.keyValue;
        if (!keyValue) {
          throw new Error(`Missing keyValue for inline source: ${keyName}`);
        }
        break;
    }

    if (!keyValue) {
      throw new Error(`Failed to load key: ${keyName}`);
    }

    // Cache for future use
    this.cache.set(keyName, keyValue);
    return keyValue;
  }

  /**
   * Check if a key exists and is accessible
   */
  async hasKey(keyName: string): Promise<boolean> {
    try {
      await this.getKey(keyName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache (use after key rotation)
   */
  clearCache(keyName?: string): void {
    if (keyName) {
      this.cache.delete(keyName);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Read key from file (strip whitespace/newlines)
   */
  private async readKeyFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content.trim();
    } catch (error) {
      throw new Error(`Failed to read key file ${filePath}: ${(error as Error).message}`);
    }
  }
}

/**
 * Global key manager instance
 */
let globalKeyManager: KeyManager | null = null;

/**
 * Get or create global key manager
 */
export function getKeyManager(): KeyManager {
  if (!globalKeyManager) {
    globalKeyManager = new KeyManager();
  }
  return globalKeyManager;
}

/**
 * Register a key with global manager
 */
export function registerKey(keyName: string, config: KeyConfig): void {
  getKeyManager().registerKey(keyName, config);
}

/**
 * Get a key from global manager
 */
export async function getKey(keyName: string): Promise<string> {
  return getKeyManager().getKey(keyName);
}
