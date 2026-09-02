/**
 * Otto Ordered State Storage System (OSSS)
 * Secure state storage with versioning and safe migrations
 */

export { StateManager, type StateVersion, type MigrationFn } from './state-manager.js';
export {
  MigrationBuilder,
  createMigration,
  type MigrationFn
} from './migration.js';
