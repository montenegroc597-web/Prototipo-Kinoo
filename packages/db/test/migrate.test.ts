import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { describe, expect, it } from 'vitest';
import { checksum, fromPglite, migrate } from '../src';
import { migrationInput } from '../src/files';

describe('aplicador de migraciones', () => {
  it('aplica todo una vez, lo registra y no repite en la segunda corrida', async () => {
    const sql = fromPglite(new PGlite({ extensions: { vector } }));
    const input = migrationInput('postgres', { seeds: false });
    const first = await migrate(sql, input);
    expect(first.applied).toEqual(input.migrations.map((m) => m.name));
    const second = await migrate(sql, input);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toHaveLength(input.migrations.length);
  });

  it('se niega a seguir si alguien editó una migración ya aplicada', async () => {
    const sql = fromPglite(new PGlite({ extensions: { vector } }));
    const input = migrationInput('postgres', { seeds: false });
    await migrate(sql, input);
    const edited = { ...input, migrations: input.migrations.map((m, i) => (i === 0 ? { ...m, sql: `${m.sql}\n-- cambio` } : m)) };
    await expect(migrate(sql, edited)).rejects.toThrow(/cambió después de aplicarse/);
  });

  it('si una migración falla, no queda a medias ni registrada', async () => {
    const sql = fromPglite(new PGlite({ extensions: { vector } }));
    const input = migrationInput('postgres', { seeds: false });
    const broken = {
      ...input,
      migrations: [...input.migrations, { name: '9999_rota.sql', sql: 'create table ok_parcial (id int); select * from tabla_que_no_existe;' }],
    };
    await expect(migrate(sql, broken)).rejects.toThrow();
    const t = await sql.query(`select to_regclass('ok_parcial') as t`);
    expect(t.rows[0]).toEqual({ t: null });
    const reg = await sql.query<{ name: string }>('select name from kinoo_migrations');
    expect(reg.rows.map((r) => r.name)).not.toContain('9999_rota.sql');
  });

  it('checksum estable', () => {
    expect(checksum('abc')).toBe(checksum('abc'));
    expect(checksum('abc')).not.toBe(checksum('abd'));
  });
});
