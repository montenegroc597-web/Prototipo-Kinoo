// La API HTTP de Kinoo como una función (Request) => Response. No depende de ningún servidor ni nube.
import { ApiError, type KinooRepository, KinooRunner, type KinooService } from '@kinoo/core';
import type { Authenticator } from './auth';

export interface HandlerOptions {
  /** Repositorio de datos. El catálogo se lee de aquí y se cachea. */
  repository: KinooRepository;
  /** Opcional: repositorio para los datos de la persona según la petición (por ejemplo, Supabase con su JWT). */
  userRepository?: (req: Request) => KinooRepository;
  auth: Authenticator;
  /** Orígenes permitidos para CORS ("*" o una lista). */
  allowedOrigins?: string[] | '*';
  now?: () => Date;
  /** Base pública de los pósters locales ("posters/<id>.jpg"). */
  assetBaseUrl?: string;
}

interface Ctx {
  run: <T>(fn: (s: KinooService) => T) => Promise<T>;
  userId: string;
  req: Request;
  url: URL;
}
type Route = (ctx: Ctx) => Promise<unknown>;

const readJson = async (req: Request) => {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, 'El cuerpo debe ser JSON');
  }
};
const num = (v: string | null) => (v === null || v === '' ? undefined : Number(v));

/** Rutas: método + final de la ruta. Se comparan por sufijo para servir igual en /api/…, /functions/v1/… o la raíz. */
const ROUTES: Array<[string, string, Route]> = [
  [
    'POST',
    '/events',
    async ({ run, req }) => {
      const b = await readJson(req);
      return run((s) => s.postEvents(b?.events));
    },
  ],
  ['GET', '/deck/current', ({ run }) => run((s) => ({ deck: s.currentDeck() }))],
  [
    'POST',
    '/deck/open',
    async ({ run, req }) => {
      const b = await readJson(req);
      return run((s) => ({ deck: s.openDeck(b ?? {}) }));
    },
  ],
  [
    'GET',
    '/watch/proposal',
    ({ run, url }) => {
      const q = url.searchParams;
      const filters = {
        ...(num(q.get('max_runtime_min')) !== undefined ? { max_runtime_min: num(q.get('max_runtime_min')) } : {}),
        ...(q.get('vibe') ? { vibe: q.get('vibe') } : {}),
        ...(q.get('company') ? { company: q.get('company')! } : {}),
      };
      return run((s) => s.watchProposal(filters));
    },
  ],
  [
    'POST',
    '/onboarding',
    async ({ run, req }) => {
      const b = await readJson(req);
      return run((s) => s.onboarding(b));
    },
  ],
  ['GET', '/profile', ({ run }) => run((s) => s.profile())],
];

export function createKinooHandler(o: HandlerOptions): (req: Request) => Promise<Response> {
  const runner = new KinooRunner(o.repository, { now: o.now, assetBaseUrl: o.assetBaseUrl });

  return async (req) => {
    const origin = req.headers.get('origin') ?? '';
    const allowed = o.allowedOrigins ?? '*';
    const cors: Record<string, string> = {
      'Access-Control-Allow-Origin': allowed === '*' ? '*' : allowed.includes(origin) ? origin : 'null',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      Vary: 'Origin',
    };
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '');
    if (path.endsWith('/health') || path === '') return json({ ok: true, service: 'kinoo-api' });
    const match = ROUTES.find(([m, suffix]) => path.endsWith(suffix) && m === req.method);
    if (!match) {
      const exists = ROUTES.some(([, suffix]) => path.endsWith(suffix));
      return json({ error: exists ? 'Método no permitido' : 'Ruta desconocida' }, exists ? 405 : 404);
    }
    try {
      const userId = await o.auth(req);
      if (!userId) return json({ error: 'Falta una sesión válida' }, 401);
      const userRepo = o.userRepository?.(req) ?? o.repository;
      const run: Ctx['run'] = (fn) => runner.run(userId, fn, userRepo);
      return json(await match[2]({ run, userId, req, url }));
    } catch (e) {
      if (e instanceof ApiError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Error interno' }, 500);
    }
  };
}
