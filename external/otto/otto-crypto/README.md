# otto-crypto

**Otto Crypto** - AES-256-GCM encryption/decryption for securing sensitive data at rest.

## Purpose

Otto Crypto provides authenticated encryption to protect sensitive data (OAuth credentials, tokens, API keys) from being copied or read if storage is compromised. It:
- Uses AES-256-GCM for strong authenticated encryption
- Supports key management from env vars, files, or inline
- Never logs key material for security
- Works seamlessly with [otto-osss](../otto-osss) for encrypted state storage
- Prevents tampering with authentication tags

## Installation

```bash
npm install otto-crypto
```

## Usage

### Basic Encryption/Decryption

```typescript
import { encrypt, decrypt, generateKey } from 'otto-crypto';

// Generate or provide encryption key
const key = generateKey();  // Random 32-byte key

// Encrypt
const data = { clientId: 'abc123', clientSecret: 'xyz789' };
const encrypted = encrypt(data, key);
console.log(encrypted);
// {
//   iv: 'a1b2c3d4...',
//   ciphertext: 'e5f6g7h8...',
//   authTag: 'i9j0k1l2...',
//   algorithm: 'aes-256-gcm'
// }

// Decrypt
const decrypted = decrypt(encrypted, key);
console.log(decrypted);  // { clientId: 'abc123', clientSecret: 'xyz789' }
```

### Key Management from Environment

```typescript
import { registerKey, getKey, encrypt, decrypt } from 'otto-crypto';

// Register key sourced from environment variable
registerKey('oauth-credentials', {
  source: 'env',
  envVarName: 'OTTO_CRYPTO_KEY'
});

// Later, when encrypting:
const key = await getKey('oauth-credentials');
const encrypted = encrypt(sensitiveData, key);

// Decrypt (key fetched from cache or env)
const key2 = await getKey('oauth-credentials');
const decrypted = decrypt(encrypted, key2);
```

### Key Management from File

```typescript
import { registerKey, getKey } from 'otto-crypto';

// Register key sourced from file
registerKey('oauth-credentials', {
  source: 'file',
  filePath: '/secure/path/encryption.key'
});

// File should contain the hex-encoded key
```

### Integration with otto-osss

```typescript
import { StateManager } from 'otto-osss';
import { encrypt, decrypt, getKey } from 'otto-crypto';

const manager = new StateManager('/path/to/state.json', '1.0.0');

// Encrypt before save
async function saveSecureState(state) {
  const key = await getKey('oauth-credentials');
  const sensitive = {
    clientId: state.clientId,
    clientSecret: state.clientSecret
  };
  const encrypted = encrypt(sensitive, key);
  
  // Save both encrypted secrets and public data
  await manager.save({
    ...state,
    __secrets: encrypted
  });
}

// Decrypt after load
async function loadSecureState() {
  const key = await getKey('oauth-credentials');
  const state = await manager.load();
  
  if (state.__secrets) {
    const secrets = decrypt(state.__secrets, key);
    return { ...state, ...secrets };
  }
  return state;
}
```

## Security Best Practices

1. **Key Storage**
   - Store encryption keys in environment variables or secure key files
   - Never commit keys to version control
   - Use separate keys per environment (dev, staging, prod)

2. **Key Rotation**
   - Periodically rotate encryption keys
   - Use key versioning if supporting multiple keys
   - Update OTTO_CRYPTO_KEY in deployment

3. **Secrets Management**
   - Encrypt all sensitive data (clientId, clientSecret, tokens)
   - Use otto-crypto + otto-osss together for complete protection
   - Add to .gitignore: mempalace/, secrets/, .env*

4. **Never Log Secrets**
   - This library doesn't log key material
   - Ensure your error handlers don't log encrypted payloads containing secrets
   - Always validate without logging inputs

## API

### AES Encryption

- `encrypt(data: any, encryptionKey: string | Buffer): EncryptedPayload`
- `decrypt(payload: EncryptedPayload, encryptionKey: string | Buffer): any`
- `generateKey(): Buffer` - generate random 32-byte key
- `generateKeyHex(): string` - generate random key as hex string

### Key Manager

- `registerKey(keyName: string, config: KeyConfig): void`
- `getKey(keyName: string): Promise<string>`
- `hasKey(keyName: string): Promise<boolean>`
- `clearCache(keyName?: string): void`

### KeyConfig

```typescript
interface KeyConfig {
  source: 'env' | 'file' | 'inline';
  envVarName?: string;  // for 'env' source
  filePath?: string;    // for 'file' source
  keyValue?: string;    // for 'inline' source (NOT RECOMMENDED)
}
```

## Environment Setup

```bash
# Generate a key
node -e "console.log(require('otto-crypto').generateKeyHex())"

# Set environment variable
export OTTO_CRYPTO_KEY="<generated-hex-key>"

# Or store in .env (add to .gitignore)
echo "OTTO_CRYPTO_KEY=<generated-hex-key>" > .env
```

## Performance

- Encryption: ~1-5ms per operation (depends on data size)
- Decryption: ~1-5ms per operation (includes authentication)
- Key derivation (PBKDF2): ~50-100ms (one-time per key load)

Caching minimizes key derivation overhead.

## License

MIT
