// Base PostgreSQL en memoria (PGlite + pgvector) con las migraciones de Kinoo, para cualquiera de los dos proveedores.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { type Provider, fromPglite, migrate } from '../src';
import { migrationInput } from '../src/files';

export async function freshDb(opts: { provider?: Provider; seeds?: boolean } = {}) {
  const provider = opts.provider ?? 'postgres';
  const pg = new PGlite({ extensions: { vector } });
  // Supabase ya trae roles y auth.uid(): en PGlite se imitan antes de migrar.
  if (provider === 'supabase') await pg.exec(readFileSync(path.join(__dirname, 'supabase-platform-shim.sql'), 'utf8'));
  const sql = fromPglite(pg);
  const result = await migrate(sql, migrationInput(provider, { seeds: opts.seeds }));
  return { pg, sql, result };
}

/** Corre fn como una persona autenticada (RLS activo), igual en los dos proveedores. */
export async function asUser<T>(pg: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await pg.exec(`set role authenticated; select set_config('app.user_id', '${userId}', false), set_config('request.jwt.claim.sub', '${userId}', false);`);
  try {
    return await fn();
  } finally {
    await pg.exec(`reset role; select set_config('app.user_id', '', false), set_config('request.jwt.claim.sub', '', false);`);
  }
}
