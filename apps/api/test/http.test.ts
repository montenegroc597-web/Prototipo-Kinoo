import { PostgresRepository } from '@kinoo/db';
import { beforeAll, describe, expect, it } from 'vitest';
import { freshDb } from '../../../packages/db/test/db';
import { createKinooHandler, jwtHs256Auth } from '../src';
import { signJwt } from './jwt';

const SECRET = 'secreto-de-prueba-de-al-menos-32-caracteres';
const ANA = '55555555-5555-4555-8555-555555555555';

// La API HTTP completa contra PostgreSQL (PGlite) con RLS: lo que recibiría el front en cualquier nube.
describe('API HTTP', () => {
  let call: (method: string, path: string, body?: unknown, token?: string | null) => Promise<{ status: number; body: any }>;
  let token: string;

  beforeAll(async () => {
    const { sql } = await freshDb({ provider: 'postgres' });
    const handler = createKinooHandler({ repository: new PostgresRepository(sql), auth: jwtHs256Auth(SECRET), now: () => new Date('2026-11-05T20:00:00Z') });
    token = await signJwt({ sub: ANA, exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET);
    call = async (method, path, body, t = token) => {
      const r = await handler(
        new Request(`http://localhost/api${path}`, {
          method,
          headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
      return { status: r.status, body: r.status === 204 ? null : await r.json() };
    };
  });

  it('GET /health responde sin sesión', async () => {
    expect(await call('GET', '/health', undefined, null)).toEqual({ status: 200, body: { ok: true, service: 'kinoo-api' } });
  });

  it('sin sesión válida responde 401; ruta desconocida 404; método equivocado 405', async () => {
    expect((await call('GET', '/profile', undefined, null)).status).toBe(401);
    expect((await call('GET', '/profile', undefined, 'token-falso')).status).toBe(401);
    expect((await call('GET', '/no-existe')).status).toBe(404);
    expect((await call('GET', '/events')).status).toBe(405);
  });

  it('flujo completo: abrir mazo, guardar, cerrar, propuesta de Ver, confirmar', async () => {
    const open = await call('POST', '/deck/open', { vibe: 'sufrir', size: 5 });
    expect(open.status).toBe(200);
    const deck = open.body.deck;
    expect(deck.vibe).toBe('llorar_bonito');
    expect(deck.cards).toHaveLength(5);
    expect((await call('GET', '/deck/current')).body.deck.deck_id).toBe(deck.deck_id);

    const id = deck.cards[0].movie_id;
    const ev = await call('POST', '/events', {
      events: [
        { type: 'saved_intent', movie_id: id, payload: { flipped: false, deck_id: deck.deck_id, slot: 1 } },
        { type: 'deck_completed', payload: { deck_id: deck.deck_id } },
      ],
    });
    expect(ev.status).toBe(200);
    expect(ev.body.accepted).toBe(2);
    expect(ev.body.results.some((r: any) => r.closing)).toBe(true);

    const w = await call('GET', '/watch/proposal?max_runtime_min=300');
    expect(w.body.status).toBe('proposal');
    expect(w.body.card.movie_id).toBe(id);

    const before = (await call('GET', '/profile')).body;
    await call('POST', '/events', { events: [{ type: 'watch_confirmed', movie_id: id, payload: { reaction: 'loved' } }] });
    const after = (await call('GET', '/profile')).body;
    expect(after.signal_count).toBe(before.signal_count + 1);
    expect(after.archetype.name).toBeTruthy();
  });

  it('errores de validación responden 400 con mensaje en español', async () => {
    expect(await call('POST', '/deck/open', { size: 7 })).toEqual({ status: 400, body: { error: 'El tamaño del mazo debe ser 5, 10 o 20' } });
    expect((await call('POST', '/events', { events: [{ type: 'swipe_up', payload: {} }] })).status).toBe(400);
    expect((await call('POST', '/onboarding', { step: 'otro' })).status).toBe(400);
  });

  it('CORS: responde a OPTIONS', async () => {
    const h = createKinooHandler({ repository: {} as never, auth: async () => null, allowedOrigins: ['https://montenegroc597-web.github.io'] });
    const r = await h(new Request('http://x/api/events', { method: 'OPTIONS', headers: { origin: 'https://montenegroc597-web.github.io' } }));
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe('https://montenegroc597-web.github.io');
  });
});
