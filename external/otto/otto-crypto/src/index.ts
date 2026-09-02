/**
 * Otto Crypto - Encryption/Decryption Utilities
 * Secure sensitive data at rest with AES-256-GCM
 */

export {
  encrypt,
  decrypt,
  generateKey,
  generateKeyHex,
  type EncryptedPayload
} from './aes.js';

export {
  KeyManager,
  registerKey,
  getKey,
  getKeyManager,
  type KeyConfig
} from './key-manager.js';
