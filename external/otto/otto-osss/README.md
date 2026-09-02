# otto-osss

**Otto Ordered State Storage System** - Secure state storage with versioning, automatic migrations, and backup preservation.

## Purpose

OSSS provides safe, ordered state persistence across application updates without data loss. It:
- Maintains version-aware state with automatic migration chains
- Creates automatic backups before each write
- Preserves complete backup history
- Supports atomic writes to prevent corruption
- Enables rollback to previous states

## Installation

```bash
npm install otto-osss
```

## Usage

### Basic State Management

```typescript
import { StateManager } from 'otto-osss';

// Initialize manager
const manager = new StateManager(
  '/path/to/state.json',
  '1.0.0'  // current version
);

// Load state (with auto-migration if needed)
const state = await manager.load();

// Modify and save
state.userId = 'user-123';
state.preferences = { theme: 'dark' };
await manager.save(state);
```

### Version Migrations

```typescript
import { StateManager, MigrationBuilder, createMigration } from 'otto-osss';

const manager = new StateManager('/path/to/state.json', '2.0.0');

// Register migrations
manager.registerMigration(
  new MigrationBuilder()
    .fromVersion('1.0.0')
    .toVersion('1.1.0')
    .renameKey('userName', 'userId')  // Rename field
    .addKey('createdAt', new Date().toISOString())  // Add new field
    .build()
);

manager.registerMigration(
  new MigrationBuilder()
    .fromVersion('1.1.0')
    .toVersion('2.0.0')
    .transformPath('settings.theme', val => val?.toLowerCase?.() || 'light')
    .build()
);

// State automatically migrates when loaded
const state = await manager.load();  // v1.0.0 → v1.1.0 → v2.0.0
```

### Backup Management

```typescript
// Get backup history
const backups = await manager.getBackupHistory();
console.log(backups);  // ['state-2026-09-02T13-32-46.json', ...]

// Restore from backup
const oldState = await manager.restoreFromBackup(backups[0]);
await manager.save(oldState);
```

## Security

- **No Plaintext Secrets**: OSSS stores state as-is. Use [otto-crypto](../otto-crypto) for encrypted sensitive data.
- **Atomic Writes**: All writes complete atomically to prevent corruption.
- **Backup Preservation**: Keeps last 10 backups (configurable) before deletion.
- **Type Safe**: Full TypeScript support with strict typing.

## API

### StateManager

- `constructor(statePath, currentVersion?, backupDir?)`
- `load(): Promise<Record<string, any>>`
- `save(data: Record<string, any>): Promise<void>`
- `getBackupHistory(): Promise<string[]>`
- `restoreFromBackup(backupFilename: string): Promise<Record<string, any>>`
- `registerMigration(migration: MigrationFn): void`

### MigrationBuilder

Chainable builder for creating migrations:
- `fromVersion(version: string): this`
- `toVersion(version: string): this`
- `step(transform: Function): this`
- `renameKey(oldKey, newKey): this`
- `addKey(key, defaultValue): this`
- `transformPath(path, transform): this`
- `build(): MigrationFn`

## Integration with otto-crypto

For encrypted state storage:

```typescript
import { StateManager } from 'otto-osss';
import { encrypt, decrypt } from 'otto-crypto';

const manager = new StateManager('/path/to/state.json', '1.0.0');

// Encrypt before save
const state = await manager.load();
const encrypted = await encrypt(state, 'encryption-key');
await manager.save({ __encrypted: encrypted });

// Decrypt after load
const loaded = await manager.load();
const decrypted = await decrypt(loaded.__encrypted, 'encryption-key');
```

## License

MIT
