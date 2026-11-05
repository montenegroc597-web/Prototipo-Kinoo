// Cliente SQL mínimo que el paquete necesita. Hay adaptadores para `pg` (servidor Node, cualquier nube)
// y para PGlite (pruebas). Así ningún código depende de un proveedor concreto.
export interface SqlRunner {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  /** Ejecuta varias sentencias seguidas (migraciones). */
  exec(text: string): Promise<void>;
}

export interface SqlClient extends SqlRunner {
  transaction<T>(fn: (tx: SqlRunner) => Promise<T>): Promise<T>;
}

/** Adaptador para un Pool de `pg` (node-postgres). */
export function fromPgPool(pool: {
  query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }>;
  connect: () => Promise<{ query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }>; release: () => void }>;
}): SqlClient {
  const wrap = (q: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }>): SqlRunner => ({
    query: async <T>(t: string, p?: unknown[]) => ({ rows: (await q(t, p)).rows as T[] }),
    exec: async (t: string) => {
      await q(t);
    },
  });
  return {
    ...wrap((t, p) => pool.query(t, p)),
    async transaction(fn) {
      const c = await pool.connect();
      try {
        await c.query('begin');
        const out = await fn(wrap((t, p) => c.query(t, p)));
        await c.query('commit');
        return out;
      } catch (e) {
        await c.query('rollback');
        throw e;
      } finally {
        c.release();
      }
    },
  };
}

/** Adaptador para PGlite (PostgreSQL en memoria, usado en las pruebas). */
export function fromPglite(db: {
  query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }>;
  exec: (t: string) => Promise<unknown>;
  transaction: <T>(
    fn: (tx: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }>; exec: (t: string) => Promise<unknown> }) => Promise<T>,
  ) => Promise<T>;
}): SqlClient {
  const wrap = (x: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }>; exec: (t: string) => Promise<unknown> }): SqlRunner => ({
    query: async <T>(t: string, p?: unknown[]) => ({ rows: (await x.query(t, p)).rows as T[] }),
    exec: async (t: string) => {
      await x.exec(t);
    },
  });
  return { ...wrap(db), transaction: (fn) => db.transaction((tx) => fn(wrap(tx))) };
}
