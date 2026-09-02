/**
 * Crypto Adapter - Node.js implementation for Otto-Crypto
 * Follows contracts from external/otto/otto-crypto
 * Provides AES-256-GCM authenticated encryption for sensitive data
 */

import crypto from 'crypto';

/**
 * AES-256-GCM authenticated encryption
 */
export class CryptoAdapter {
  /**
   * Encrypt data with AES-256-GCM
   * @param {string|Buffer} data - Data to encrypt
   * @param {Buffer} key - 32-byte encryption key
   * @returns {Object} - { iv, ciphertext, authTag, algorithm }
   */
  static encrypt(data, key) {
    if (key.length !== 32) {
      throw new Error('Encryption key must be 32 bytes');
    }

    const plaintext =
      typeof data === 'string' ? data : JSON.stringify(data);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      ciphertext: encrypted,
      authTag: authTag.toString('hex'),
      algorithm: 'aes-256-gcm',
    };
  }

  /**
   * Decrypt AES-256-GCM encrypted payload
   * @param {Object} payload - { iv, ciphertext, authTag, algorithm }
   * @param {Buffer} key - 32-byte encryption key
   * @returns {string|Object} - Decrypted data (attempts JSON parse, returns string if not JSON)
   */
  static decrypt(payload, key) {
    if (!payload.iv || !payload.ciphertext || !payload.authTag) {
      throw new Error('Invalid encrypted payload');
    }

    if (key.length !== 32) {
      throw new Error('Decryption key must be 32 bytes');
    }

    const iv = Buffer.from(payload.iv, 'hex');
    const ciphertext = payload.ciphertext;
    const authTag = Buffer.from(payload.authTag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Try to parse as JSON, return as string if not
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  /**
   * Generate random 32-byte encryption key
   * @returns {Buffer}
   */
  static generateKey() {
    return crypto.randomBytes(32);
  }

  /**
   * Generate random key as hex string
   * @returns {string}
   */
  static generateKeyHex() {
    return CryptoAdapter.generateKey().toString('hex');
  }

  /**
   * Derive consistent key from password using PBKDF2
   * @param {string} password - Password to derive from
   * @returns {Buffer}
   */
  static deriveKey(password) {
    const salt = 'otto-crypto-salt'; // Fixed salt for consistency
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }
}

/**
 * Key manager for loading keys from various sources
 */
export class KeyManager {
  constructor() {
    this.keys = new Map();
    this.configs = new Map();
  }

  /**
   * Register a key configuration
   * @param {string} keyName - Name of the key
   * @param {Object} config - { source: 'env'|'file'|'inline', envVarName?, filePath?, keyValue? }
   */
  registerKey(keyName, config) {
    this.configs.set(keyName, config);
  }

  /**
   * Get key from cache or load from source
   * @param {string} keyName
   * @returns {Buffer|null}
   */
  async getKey(keyName) {
    // Check cache first
    if (this.keys.has(keyName)) {
      return this.keys.get(keyName);
    }

    const config = this.configs.get(keyName);
    if (!config) {
      return null;
    }

    let key = null;

    if (config.source === 'env') {
      const value = process.env[config.envVarName];
      if (value) {
        key = Buffer.from(value, 'hex');
      }
    } else if (config.source === 'file') {
      try {
        const { promises: fs } = await import('fs');
        const content = await fs.readFile(config.filePath, 'utf8');
        key = Buffer.from(content.trim(), 'hex');
      } catch (err) {
        console.warn(`Failed to load key from ${config.filePath}:`, err.message);
      }
    } else if (config.source === 'inline') {
      console.warn(`[Crypto] Using inline key for ${keyName}; not recommended for production`);
      key = Buffer.from(config.keyValue, 'hex');
    }

    if (key) {
      this.keys.set(keyName, key);
    }

    return key;
  }

  /**
   * Check if key is available without loading
   */
  hasKey(keyName) {
    return this.configs.has(keyName);
  }

  /**
   * Clear key from cache
   */
  clearCache(keyName = null) {
    if (keyName) {
      this.keys.delete(keyName);
    } else {
      this.keys.clear();
    }
  }
}

// Global instance
let globalKeyManager = null;

export function getKeyManager() {
  if (!globalKeyManager) {
    globalKeyManager = new KeyManager();
  }
  return globalKeyManager;
}
