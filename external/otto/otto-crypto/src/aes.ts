/**
 * Otto Crypto - AES Encryption/Decryption
 * 
 * Provides AES-256-GCM encryption for securing sensitive data at rest.
 * Uses authenticated encryption to prevent tampering.
 */

import crypto from 'node:crypto';

export interface EncryptedPayload {
  iv: string;  // initialization vector (hex)
  ciphertext: string;  // encrypted data (hex)
  authTag: string;  // authentication tag (hex)
  algorithm: string;  // 'aes-256-gcm'
}

/**
 * Encrypt data with AES-256-GCM
 */
export function encrypt(
  data: any,
  encryptionKey: string | Buffer
): EncryptedPayload {
  // Ensure key is proper length (32 bytes for AES-256)
  const key = deriveKey(encryptionKey);
  
  // Generate random IV (16 bytes)
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // Encrypt data
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final()
  ]);
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    authTag: authTag.toString('hex'),
    algorithm: 'aes-256-gcm'
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
export function decrypt(
  payload: EncryptedPayload,
  encryptionKey: string | Buffer
): any {
  // Validate payload
  if (!payload.iv || !payload.ciphertext || !payload.authTag) {
    throw new Error('Invalid encrypted payload: missing required fields');
  }
  
  if (payload.algorithm !== 'aes-256-gcm') {
    throw new Error(`Unsupported algorithm: ${payload.algorithm}`);
  }
  
  // Ensure key is proper length
  const key = deriveKey(encryptionKey);
  
  // Reconstruct IV, ciphertext, and auth tag
  const iv = Buffer.from(payload.iv, 'hex');
  const ciphertext = Buffer.from(payload.ciphertext, 'hex');
  const authTag = Buffer.from(payload.authTag, 'hex');
  
  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  try {
    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString('utf-8');
    
    // Attempt to parse as JSON; return as string if fails
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    throw new Error(`Decryption failed: ${(error as Error).message}`);
  }
}

/**
 * Derive a consistent 32-byte key from input string or buffer
 * Uses PBKDF2 for key derivation from passwords
 */
function deriveKey(input: string | Buffer): Buffer {
  if (Buffer.isBuffer(input)) {
    if (input.length === 32) return input;
    if (input.length > 32) return input.slice(0, 32);
    // Pad short keys with zeros
    const padded = Buffer.alloc(32);
    input.copy(padded);
    return padded;
  }
  
  // String key: derive using PBKDF2
  // For consistency, use fixed salt (in real usage, consider unique salt per instance)
  const salt = Buffer.from('otto-crypto-salt', 'utf-8');
  return crypto.pbkdf2Sync(input, salt, 100000, 32, 'sha256');
}

/**
 * Generate a random encryption key
 */
export function generateKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Generate a random encryption key as hex string
 */
export function generateKeyHex(): string {
  return generateKey().toString('hex');
}
