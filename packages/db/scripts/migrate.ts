// Aplica las migraciones en un PostgreSQL real. Uso:
//   DATABASE_URL=postgres://… npm run db:migrate                 (proveedor genérico)
//   DATABASE_URL=postgres://… npm run db:migrate -- --supabase   (conexión directa a Supabase)
//   … -- --no-seeds                                               (sin cargar configuración ni catálogo)
import pg from 'pg';
import { fromPgPool, migrate } from '../src';
import { migrationInput } from '../src/files';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL (ver .env.example).');
  process.exit(2);
}
const provider = process.argv.includes('--supabase') ? 'supabase' : 'postgres';
const pool = new pg.Pool({ connectionString: url, max: 2 });
try {
  const r = await migrate(fromPgPool(pool), migrationInput(provider, { seeds: !process.argv.includes('--no-seeds') }));
  console.log(
    `Proveedor ${provider}. Aplicadas: ${r.applied.join(', ') || 'ninguna'}. Ya estaban: ${r.skipped.length}. Semillas: ${r.seeded.join(', ') || 'ninguna'}.`,
  );
} finally {
  await pool.end();
}
