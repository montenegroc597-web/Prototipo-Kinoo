// Aplica las migraciones en cualquier PostgreSQL. Lleva registro en kinoo_migrations para no repetirlas.
// Proveedores: 'postgres' (genérico) o 'supabase'. El SQL de cada migración es el mismo para ambos.
import type { SqlClient } from './sql';

export type Provider = 'postgres' | 'supabase';

export interface MigrationFile {
  name: string;
  sql: string;
}

export interface MigrateInput {
  provider: Provider;
  providerSql: string;
  migrations: MigrationFile[];
  seeds?: MigrationFile[];
}

export interface MigrateResult {
  applied: string[];
  skipped: string[];
  seeded: string[];
}

/** Suma de verificación simple (FNV-1a) para detectar migraciones editadas después de aplicarse. */
export function checksum(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export async function migrate(db: SqlClient, input: MigrateInput): Promise<MigrateResult> {
  await db.exec(`create table if not exists kinoo_migrations (
    name text primary key, checksum text not null, provider text not null, applied_at timestamptz not null default now())`);
  // El proveedor es idempotente: se aplica siempre (define kinoo_current_user()).
  await db.exec(input.providerSql);
  const done = new Map(
    (await db.query<{ name: string; checksum: string }>('select name, checksum from kinoo_migrations')).rows.map((r) => [r.name, r.checksum]),
  );
  const out: MigrateResult = { applied: [], skipped: [], seeded: [] };
  for (const m of [...input.migrations].sort((a, b) => a.name.localeCompare(b.name))) {
    const sum = checksum(m.sql);
    const prev = done.get(m.name);
    if (prev) {
      if (prev !== sum) throw new Error(`La migración ${m.name} cambió después de aplicarse. Crea una migración nueva en vez de editarla.`);
      out.skipped.push(m.name);
      continue;
    }
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.query('insert into kinoo_migrations (name, checksum, provider) values ($1, $2, $3)', [m.name, sum, input.provider]);
    });
    out.applied.push(m.name);
  }
  for (const s of input.seeds ?? []) {
    await db.exec(s.sql);
    out.seeded.push(s.name);
  }
  return out;
}
