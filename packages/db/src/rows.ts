import type { ActiveDeck } from '@kinoo/engine';
// Convierte filas de Supabase en la configuración, el catálogo y los mazos que recibe el motor.
// Es puro: lo usan las Edge Functions (con las filas de la base) y las pruebas (con PGlite).
import type { AtomVector, CuratedDeck, EngineConfig, KinooEvent, Movie, Params } from '@kinoo/shared';

type Row = Record<string, unknown>;
// jsonb llega ya parseado desde Supabase y PGlite; si llega como texto (otros clientes), se parsea.
const json = <T>(v: unknown): T => {
  if (typeof v !== 'string') return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return v as T;
  }
};

export interface ConfigRows {
  atoms: Row[];
  vibes: Row[];
  action_weights: Row[];
  deck_recipes: Row[];
  explanation_templates: Row[];
  archetypes: Row[];
  config: Row[];
}

export function rowsToConfig(r: ConfigRows): EngineConfig {
  const params = Object.fromEntries(r.config.map((x) => [x.key as string, json(x.value)])) as unknown as Params;
  return {
    atoms: [...r.atoms]
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((a) => ({ key: a.key, dimension: a.dimension, label: a.label, description: a.description })) as EngineConfig['atoms'],
    vibes: r.vibes.map((v) => ({
      key: v.key as string,
      name: v.name as string,
      definition: v.definition as string,
      aliases: (v.aliases as string[]) ?? [],
      active: !!v.active,
      version: Number(v.version),
      recipe: json(v.recipe),
      ...(v.quality_weight !== null && v.quality_weight !== undefined ? { quality_weight: Number(v.quality_weight) } : {}),
      example_movie_ids: (v.example_movie_ids as string[]) ?? [],
    })),
    actionWeights: r.action_weights.map((w) => ({
      action: w.action as string,
      variant: w.variant as string,
      signal: Number(w.signal),
      eta: Number(w.eta),
      reason: (w.reason as string) ?? undefined,
    })),
    deckRecipes: r.deck_recipes.map((d) => ({ size: Number(d.size), default: !!d.is_default, slots: json(d.slots) })),
    templates: r.explanation_templates.map((t) => ({ key: t.key as string, text: t.text as string })),
    archetypes: r.archetypes.map((a) => ({ key: a.key as string, name: a.name as string, recipe: json(a.recipe) })),
    params,
  };
}

export function rowToMovie(m: Row): Movie {
  return {
    id: m.id as string,
    tmdb_id: (m.tmdb_id as number) ?? undefined,
    title: m.title as string,
    original_title: (m.original_title as string) ?? undefined,
    year: Number(m.year),
    runtime_min: Number(m.runtime_min),
    genres: (m.genres as string[]) ?? [],
    directors: (m.directors as string[]) ?? [],
    countries: (m.countries as string[]) ?? [],
    original_language: (m.original_language as string) ?? '',
    vote_average: Number(m.vote_average ?? 0),
    vote_count: Number(m.vote_count ?? 0),
    popularity: m.popularity === null ? undefined : Number(m.popularity),
    poster_path: (m.poster_path as string) ?? null,
    overview: (m.overview as string) ?? '',
    atoms: json<AtomVector>(m.atoms),
    hook: m.hook as string,
    pillars: json(m.pillars),
    providers: json(m.providers),
    tagger: { model: m.tagger_model as string, prompt_version: m.prompt_version as string, tagged_at: String(m.tagged_at) },
    source: m.source as Movie['source'],
  };
}

/** Valores efectivos con votos de la comunidad (vista movie_effective_atoms). Solo incluye películas con votos. */
export function rowsToEffectiveAtoms(rows: Row[]): Map<string, AtomVector> {
  const byMovie = new Map<string, { votes: number; atoms: Record<string, number> }>();
  for (const r of rows) {
    const id = r.movie_id as string;
    const e = byMovie.get(id) ?? { votes: 0, atoms: {} };
    e.atoms[r.atom as string] = Number(r.value);
    e.votes += Number(r.votes);
    byMovie.set(id, e);
  }
  const out = new Map<string, AtomVector>();
  for (const [id, e] of byMovie) if (e.votes > 0) out.set(id, e.atoms as AtomVector);
  return out;
}

export function rowsToCuratedDecks(decks: Row[], items: Row[]): CuratedDeck[] {
  return decks.map((d) => {
    const its = items.filter((i) => i.deck_id === d.id).sort((a, b) => Number(a.position) - Number(b.position));
    return {
      id: d.id as string,
      owner_kind: d.owner_kind as CuratedDeck['owner_kind'],
      owner_id: (d.owner_id as string) ?? 'system',
      owner_name: d.owner_name as string,
      title: d.title as string,
      movie_ids: its.map((i) => i.movie_id as string),
      notes: Object.fromEntries(its.filter((i) => i.note).map((i) => [i.movie_id as string, i.note as string])),
    };
  });
}

export function rowToEvent(e: Row): KinooEvent {
  return {
    id: e.id,
    user_id: e.user_id,
    type: e.type,
    movie_id: e.movie_id ?? undefined,
    at: new Date(e.at as string).toISOString(),
    context: json(e.context ?? {}),
    payload: json(e.payload ?? {}),
  } as KinooEvent;
}

export function eventToRow(e: KinooEvent): Row {
  return { id: e.id, user_id: e.user_id, type: e.type, movie_id: e.movie_id ?? null, at: e.at, context: e.context ?? {}, payload: e.payload ?? {} };
}

export function rowToActiveDeck(r: Row | null | undefined): ActiveDeck | null {
  if (!r) return null;
  const extra = json<{ special_threshold: number; cards: ActiveDeck['cards'] }>(r.cards);
  return {
    deck_id: r.deck_id as string,
    user_id: r.user_id as string,
    vibe: (r.vibe as string) ?? null,
    size: Number(r.size),
    opened_at: new Date(r.opened_at as string).toISOString(),
    cards: extra.cards,
    special_threshold: extra.special_threshold,
    profile_before: json(r.profile_before),
    special_used: !!r.special_used,
    ...(r.completed_at ? { completed_at: new Date(r.completed_at as string).toISOString() } : {}),
  };
}

export function activeDeckToRow(d: ActiveDeck): Row {
  return {
    deck_id: d.deck_id,
    user_id: d.user_id,
    vibe: d.vibe,
    size: d.size,
    opened_at: d.opened_at,
    completed_at: d.completed_at ?? null,
    cards: { special_threshold: d.special_threshold, cards: d.cards },
    profile_before: d.profile_before,
    special_used: d.special_used,
  };
}
