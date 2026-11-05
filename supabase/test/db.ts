// Base PostgreSQL local en memoria (PGlite + pgvector) con las migraciones y semillas de Kinoo.
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');

export async function freshDb(opts: { seed?: boolean } = {}): Promise<PGlite> {
  const db = new PGlite({ extensions: { vector } });
  await db.exec(readFileSync(path.join(root, 'supabase/test/supabase-shim.sql'), 'utf8'));
  const migDir = path.join(root, 'supabase/migrations');
  for (const f of readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(path.join(migDir, f), 'utf8'));
  }
  if (opts.seed !== false) {
    const seedDir = path.join(root, 'supabase/seed');
    if (existsSync(seedDir)) for (const f of readdirSync(seedDir).filter((f) => f.endsWith('.sql')).sort()) {
      await db.exec(readFileSync(path.join(seedDir, f), 'utf8'));
    }
  }
  return db;
}

/** Ejecuta fn como una persona autenticada (RLS activo). */
export async function asUser<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
