// Las cinco pruebas de aprendizaje de la sección 16. Cada una devuelve métricas y si pasó.
import type { EngineConfig, Movie, PartialAtomVector } from '@kinoo/shared';
import { discoverCandidates } from '../src/candidates';
import type { ActiveDeck } from '../src/deck';
import { KinooEngine } from '../src/engine';
import { hasNumbers } from '../src/explain';
import { makeRng } from '../src/rng';
import { cosine, fromPartial } from '../src/vector';
import { KINDS, synthCatalog } from './synthCatalog';
import { SimUser } from './simUser';

export interface ScenarioResult { name: string; pass: boolean; criterion: string; metrics: Record<string, number | string | boolean> }

const allExplanations: string[] = [];
const allDecks: Array<{ deck: ActiveDeck; user: SimUser }> = [];

function engineFor(config: EngineConfig, movies: Movie[]) {
  // Mazo del equipo: 20 películas bien valoradas, para el rol "creador" sin Comunidad.
  const team = [...movies].sort((a, b) => b.vote_average - a.vote_average).slice(0, 20).map((m) => m.id);
  return new KinooEngine(config, movies, { curatedDecks: [{ id: 'team', owner_kind: 'system', owner_id: 'equipo-kinoo', owner_name: 'Equipo Kinoo', title: 'Para empezar', movie_ids: team }] });
}

function record(deck: ActiveDeck, user: SimUser) {
  allDecks.push({ deck, user });
  for (const c of deck.cards) allExplanations.push(c.explanation);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

/** 1. Aprende: tras 40 eventos, el mazo trae al menos el doble de aciertos que uno al azar y más que "las más populares". */
export function learns(config: EngineConfig, movies = synthCatalog()): ScenarioResult {
  const engine = engineFor(config, movies);
  const kinds = Object.keys(KINDS);
  const rates = { engine: [] as number[], random: [] as number[], popular: [] as number[] };
  const r = makeRng(7);
  for (let u = 0; u < 36; u++) {
    const kind = kinds[u % kinds.length]!;
    const user = new SimUser(engine, `learn-${u}`, KINDS[kind]!, 100 + u);
    // Gusto oculto en el espacio del rasgo distintivo, para que "aceptar" sea coherente con el catálogo.
    user.hidden = engine.catalog.list.filter((m) => m.movie.genres[0] === kind).reduce((acc, m) => { for (const k of Object.keys(acc) as Array<keyof typeof acc>) acc[k] += m.hat[k]; return acc; }, fromPartial({}));
    user.doOnboarding(6);
    while (user.signalCount() < 40) record(user.playDeck(null, 10, 40), user);
    const thr = user.threshold();
    const deck = engine.openDeck(user.model, { deck_id: `eval-${u}`, now: user.now() });
    record(deck, user);
    const hits = (ids: string[]) => ids.filter((id) => user.wouldAccept(engine.catalog.byId.get(id)!, null, thr)).length / ids.length;
    rates.engine.push(hits(deck.cards.map((c) => c.movie_id)));
    const cands = discoverCandidates(engine.catalog, user.model, engine.cfg, user.now());
    const shuffled = [...cands].sort(() => r() - 0.5).slice(0, 10).map((m) => m.movie.id);
    rates.random.push(hits(shuffled));
    const popular = [...cands].sort((a, b) => b.movie.vote_count * b.quality - a.movie.vote_count * a.quality).slice(0, 10).map((m) => m.movie.id);
    rates.popular.push(hits(popular));
  }
  const e = mean(rates.engine), rnd = mean(rates.random), pop = mean(rates.popular);
  return {
    name: 'Aprende', pass: e >= 2 * rnd && e > pop,
    criterion: 'Tras 40 eventos: aciertos del mazo ≥ 2 × mazo al azar y > mazo de las más populares',
    metrics: { usuarios: 36, aciertos_motor: +e.toFixed(3), aciertos_azar: +rnd.toFixed(3), aciertos_populares: +pop.toFixed(3), veces_sobre_azar: +(e / rnd).toFixed(2) },
  };
}

/** 2. Personaliza moods: dos ideas de "Llorar bonito" terminan con recetas distintas y mazos distintos. */
export function personalizesVibes(config: EngineConfig, movies = synthCatalog()): ScenarioResult {
  const engine = engineFor(config, movies);
  const vibe = 'llorar_bonito';
  const ana = new SimUser(engine, 'ana', KINDS.drama_intimo!, 1);
  const leo = new SimUser(engine, 'leo', KINDS.animacion_emotiva!, 2);
  const tasteOf = (kind: string) => engine.catalog.list.filter((m) => m.movie.genres[0] === kind).reduce((acc, m) => { for (const k of Object.keys(acc) as Array<keyof typeof acc>) acc[k] += m.hat[k]; return acc; }, fromPartial({}));
  ana.hiddenByVibe[vibe] = tasteOf('drama_intimo');
  leo.hiddenByVibe[vibe] = tasteOf('animacion_emotiva');
  ana.hidden = ana.hiddenByVibe[vibe]!; leo.hidden = leo.hiddenByVibe[vibe]!;
  for (const u of [ana, leo]) { u.doOnboarding(6); while (u.signalCount() < 60) record(u.playDeck(vibe, 10, 60), u); }
  const ra = ana.model.vibes[vibe]!.recipe, rl = leo.model.vibes[vibe]!.recipe;
  const c = cosine(ra, rl);
  const da = engine.openDeck(ana.model, { deck_id: 'pa', now: ana.now(), vibe });
  const dl = engine.openDeck(leo.model, { deck_id: 'pl', now: leo.now(), vibe });
  record(da, ana); record(dl, leo);
  const setA = new Set(da.cards.map((x) => x.movie_id));
  const shared = dl.cards.filter((x) => setA.has(x.movie_id)).length / Math.max(da.cards.length, dl.cards.length);
  const seed = fromPartial(config.vibes.find((v) => v.key === vibe)!.recipe);
  return {
    name: 'Personaliza moods', pass: c < 0.8 && shared < 0.5,
    criterion: 'Coseno entre las dos recetas personales < 0,8 y mazos que comparten menos de la mitad',
    metrics: { coseno_recetas: +c.toFixed(3), comparten: +shared.toFixed(2), coseno_ana_semilla: +cosine(ra, seed).toFixed(3), coseno_leo_semilla: +cosine(rl, seed).toFixed(3), eventos_por_usuario: 60 },
  };
}

/** 3. Responde al cambio: si el gusto oculto cambia, el perfil lo sigue en menos de 30 eventos. */
export function followsChange(config: EngineConfig, movies = synthCatalog()): ScenarioResult {
  const engine = engineFor(config, movies);
  const pairs: Array<[string, string]> = [['blockbuster', 'drama_intimo'], ['terror', 'comedia_familiar'], ['contemplativa_bn', 'neo_noir'], ['romance_luminoso', 'thriller_cerebral'], ['surreal', 'aventura_clasica'], ['cine_social', 'animacion_emotiva']];
  const needed: number[] = [];
  pairs.forEach(([from, to], i) => {
    const tasteOf = (kind: string) => engine.catalog.list.filter((m) => m.movie.genres[0] === kind).reduce((acc, m) => { for (const k of Object.keys(acc) as Array<keyof typeof acc>) acc[k] += m.hat[k]; return acc; }, fromPartial({}));
    const h1 = tasteOf(from), h2 = tasteOf(to);
    const u = new SimUser(engine, `cambio-${i}`, {}, 300 + i);
    u.hidden = h1;
    u.doOnboarding(6);
    while (u.signalCount() < 40) record(u.playDeck(null, 10, 40), u);
    u.hidden = h2;
    const start = u.signalCount();
    let after = -1;
    const check = () => {
      if (after < 0 && cosine(u.model.profile, h2) > cosine(u.model.profile, h1)) after = u.signalCount() - start;
      return after >= 0;
    };
    while (u.signalCount() - start < 80 && after < 0) record(u.playDeck(null, 10, Infinity, check), u);
    needed.push(after < 0 ? 999 : after);
  });
  const worst = Math.max(...needed);
  return {
    name: 'Responde al cambio', pass: worst < 30,
    criterion: 'Tras cambiar el gusto oculto, el perfil se parece más al gusto nuevo que al viejo en menos de 30 eventos',
    metrics: { usuarios: pairs.length, eventos_peor_caso: worst, eventos_promedio: +mean(needed).toFixed(1), por_usuario: needed.join('/') },
  };
}

/** 4. Explica: ninguna explicación tiene números ni %. Se corre después de las demás para revisar todas. */
export function explainsWithoutNumbers(): ScenarioResult {
  const bad = allExplanations.filter(hasNumbers);
  return {
    name: 'Explica', pass: allExplanations.length > 0 && bad.length === 0,
    criterion: 'Ninguna explicación contiene números ni %',
    metrics: { explicaciones_revisadas: allExplanations.length, con_numeros: bad.length },
  };
}

/** 5. Mazo: respeta la receta, sin repetir director ni películas ya marcadas. */
export function deckRespectsRecipe(config: EngineConfig): ScenarioResult {
  let roleOk = 0, dirOk = 0, markedOk = 0, sizeOk = 0;
  for (const { deck, user } of allDecks) {
    const recipe = user.engine.cfg.recipeFor(deck.size);
    // Un rol especial sin candidato pasa a afín (9.2): cuenta como respetado.
    if (deck.cards.every((c, i) => c.role === recipe.slots[i]!.role || c.role === 'afin')) roleOk++;
    const dirs = deck.cards.flatMap((c) => user.engine.catalog.byId.get(c.movie_id)!.movie.directors);
    if (new Set(dirs).size === dirs.length) dirOk++;
    if (deck.cards.length === recipe.slots.length) sizeOk++;
    markedOk++;
  }
  // Películas ya marcadas: un mazo nuevo nunca trae guardadas, vistas o descartadas recientes.
  const engine = engineFor(config, synthCatalog());
  const u = new SimUser(engine, 'marcas', KINDS.blockbuster!, 9);
  u.doOnboarding(6);
  for (let i = 0; i < 5; i++) u.playDeck(null, 10);
  const marked = new Set([...u.model.states.keys()]);
  const fresh = engine.openDeck(u.model, { deck_id: 'm', now: u.now() });
  const repeats = fresh.cards.filter((c) => marked.has(c.movie_id)).length;
  const n = allDecks.length;
  return {
    name: 'Mazo', pass: roleOk === n && dirOk === n && sizeOk === n && repeats === 0,
    criterion: 'Respeta la receta (posiciones y tamaño), sin repetir director ni películas ya marcadas',
    metrics: { mazos_revisados: n, receta_respetada: roleOk, tamano_completo: sizeOk, sin_director_repetido: dirOk, repetidas_ya_marcadas: repeats, marcadas_por_usuario: marked.size, _mo: markedOk },
  };
}

export function runAll(config: EngineConfig): ScenarioResult[] {
  allExplanations.length = 0; allDecks.length = 0;
  const out = [learns(config), personalizesVibes(config), followsChange(config)];
  out.push(explainsWithoutNumbers(), deckRespectsRecipe(config));
  return out;
}

export type { PartialAtomVector };
