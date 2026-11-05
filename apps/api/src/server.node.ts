// Servidor Node de la API (para Docker, una VM o cualquier nube con Node 22).
// Variables: DATABASE_URL (PostgreSQL), KINOO_JWT_SECRET (o KINOO_DEV_AUTH=1 solo en local), PORT, KINOO_ALLOWED_ORIGINS.
import { createServer } from 'node:http';
import { PostgresRepository, fromPgPool } from '@kinoo/db';
import pg from 'pg';
import { devHeaderAuth, jwtHs256Auth } from './auth';
import { createKinooHandler } from './handler';

const env = process.env;
if (!env.DATABASE_URL) throw new Error('Falta DATABASE_URL (ver .env.example)');
const auth = env.KINOO_JWT_SECRET ? jwtHs256Auth(env.KINOO_JWT_SECRET) : env.KINOO_DEV_AUTH === '1' && env.NODE_ENV !== 'production' ? devHeaderAuth() : null;
if (!auth) throw new Error('Falta KINOO_JWT_SECRET. Para desarrollo local, KINOO_DEV_AUTH=1.');

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: Number(env.PG_POOL_MAX ?? 10) });
const handler = createKinooHandler({
  repository: new PostgresRepository(fromPgPool(pool)),
  auth,
  assetBaseUrl: env.KINOO_ASSET_BASE_URL ?? 'https://montenegroc597-web.github.io/Prototipo-Kinoo/',
  allowedOrigins: env.KINOO_ALLOWED_ORIGINS ? env.KINOO_ALLOWED_ORIGINS.split(',') : '*',
});

const port = Number(env.PORT ?? 8787);
createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  });
  const response = await handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`Kinoo API en http://localhost:${port}`));
