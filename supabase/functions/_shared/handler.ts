// Edge Functions de Kinoo (Deno). Todas usan el mismo servicio (packages/api) y el mismo motor (packages/engine),
// empaquetados en ./kinoo-core.js con `npm run build:functions`.
// La persona se identifica con su JWT de Supabase; las consultas usan ese JWT, así que RLS aplica siempre.
// @ts-nocheck — se verifica con Deno al desplegar, no con el tsconfig de Node.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import {
  ApiError, KinooEngine, KinooService, activeDeckToRow, derivedRows, eventToRow, rowToActiveDeck, rowToEvent, rowToMovie,
  rowsToConfig, rowsToCuratedDecks, rowsToEffectiveAtoms,
} from './kinoo-core.js';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('KINOO_ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' } });

// El catálogo y la configuración se cachean en la instancia unos minutos (cambian poco).
let cache: { at: number; engine: KinooEngine } | null = null;
const CACHE_MS = 5 * 60_000;

async function must(q) { const { data, error } = await q; if (error) throw new ApiError(500, error.message); return data; }

async function loadEngine(db) {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.engine;
  const [atoms, vibes, action_weights, deck_recipes, explanation_templates, archetypes, config, movies, effective, decks, items] = await Promise.all([
    must(db.from('atoms').select('*')), must(db.from('vibes').select('*')), must(db.from('action_weights').select('*')),
    must(db.from('deck_recipes').select('*')), must(db.from('explanation_templates').select('*')), must(db.from('archetypes').select('*')),
    must(db.from('config').select('*')), must(db.from('movies').select('*')),
    must(db.from('movie_effective_atoms').select('*').gt('votes', 0)),
    must(db.from('decks').select('*').in('owner_kind', ['system', 'curator'])), must(db.from('deck_items').select('*')),
  ]);
  const engine = new KinooEngine(
    rowsToConfig({ atoms, vibes, action_weights, deck_recipes, explanation_templates, archetypes, config }),
    movies.map(rowToMovie),
    { curatedDecks: rowsToCuratedDecks(decks, items), effectiveAtoms: rowsToEffectiveAtoms(effective) },
  );
  cache = { at: Date.now(), engine };
  return engine;
}

/** Envuelve un endpoint: autentica, carga la foto de la persona, corre el servicio y guarda lo nuevo. */
export function serve(route: (svc: KinooService, req: Request, url: URL) => unknown | Promise<unknown>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    try {
      const auth = req.headers.get('Authorization');
      if (!auth) throw new ApiError(401, 'Falta el token de sesión');
      const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
      const { data: u, error } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
      if (error || !u?.user) throw new ApiError(401, 'Sesión inválida');
      const userId = u.user.id;
      const [engine, events, deckRows, follows] = await Promise.all([
        loadEngine(db),
        must(db.from('events').select('*').eq('user_id', userId).order('at')),
        must(db.from('active_decks').select('*').eq('user_id', userId).order('opened_at', { ascending: false }).limit(1)),
        must(db.from('follows').select('followee_id').eq('follower_id', userId)),
      ]);
      const snap = { user_id: userId, events: events.map(rowToEvent), active_deck: rowToActiveDeck(deckRows[0]), followed_curator_ids: follows.map((f) => f.followee_id) };
      const svc = new KinooService(engine, snap);
      const body = await route(svc, req, new URL(req.url));
      // Guardar: primero los eventos (fuente de verdad), luego lo derivado.
      if (svc.newEvents.length) await must(db.from('events').insert(svc.newEvents.map(eventToRow)));
      if (svc.deckChanged && snap.active_deck) await must(db.from('active_decks').upsert(activeDeckToRow(snap.active_deck)));
      if (svc.newEvents.length) {
        const d = derivedRows(svc.userModel);
        await must(db.from('user_taste_profiles').upsert(d.taste));
        if (d.vibes.length) await must(db.from('user_vibe_recipes').upsert(d.vibes));
        if (d.states.length) await must(db.from('user_movie_state').upsert(d.states));
      }
      return json(body);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 500;
      return json({ error: e?.message ?? String(e) }, status);
    }
  });
}

export async function body(req: Request) {
  try { return await req.json(); } catch { throw new ApiError(400, 'El cuerpo debe ser JSON'); }
}
