// Lee del disco las migraciones, el proveedor y las semillas (solo Node: CLI y pruebas).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MigrateInput, MigrationFile, Provider } from './migrate';

export const DB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readDir = (dir: string): MigrationFile[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
        .map((name) => ({ name, sql: readFileSync(path.join(dir, name), 'utf8') }))
    : [];

export function migrationInput(provider: Provider, opts: { seeds?: boolean } = {}): MigrateInput {
  return {
    provider,
    providerSql: readFileSync(path.join(DB_DIR, 'providers', `${provider}.sql`), 'utf8'),
    migrations: readDir(path.join(DB_DIR, 'migrations')),
    seeds: opts.seeds === false ? [] : readDir(path.join(DB_DIR, 'seeds')),
  };
}
