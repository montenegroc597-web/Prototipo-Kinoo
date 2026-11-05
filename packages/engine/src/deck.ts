import type { AtomKey, AtomVector, CuratedDeck, DeckRole } from '@kinoo/shared';
import { type HardFilters, discoverCandidates } from './candidates';
import type { Catalog, IndexedMovie } from './catalog';
import type { ConfigIndex } from './configIndex';
import { explain } from './explain';
import { type UserModel, ensureVibe } from './profile';
import { type Scored, percentile, scoreMovie } from './score';
import { copyVector, cosine, fromPartial, topAtoms } from './vector';

export interface DeckCard {
  slot: number;
  role: DeckRole;
  movie_id: string;
  score: number;
  explanation: string;
  special_treatment: boolean;
  curator_name?: string;
  /** Curadores seguidos que la guardaron (para match especial y sorpresa). */
  curator_count: number;
  /** Se marcó como match especial al guardarla. */
  special?: boolean;
}

/** Estado de un mazo abierto (se guarda en active_decks o en el almacenamiento local del modo demo). */
export interface ActiveDeck {
  deck_id: string;
  user_id: string;
  vibe: string | null;
  size: number;
  opened_at: string;
  cards: DeckCard[];
  profile_before: AtomVector;
  /** Umbral del 5 % más alto de la distribución de puntajes de esta persona en este contexto. */
  special_threshold: number;
  special_used: boolean;
  completed_at?: string;
}

export interface BuildDeckInput {
  deck_id: string;
  catalog: Catalog;
  model: UserModel;
  cfg: ConfigIndex;
  now: Date;
  size?: number;
  vibe?: string | null;
  curatedDecks?: CuratedDeck[];
  followedCuratorIds?: string[];
  filters?: HardFilters;
}

/**
 * Fatiga de descarte: descartar es "hoy no", así que lo muy parecido a lo descartado en las últimas horas
 * baja en el mazo. Resta peso × (mayor coseno con un descarte reciente). Evita que el mazo insista
 * en lo mismo cuando el gusto cambia.
 */
export function dismissFatigue(model: UserModel, catalog: Catalog, cfg: ConfigIndex, now: Date): (m: IndexedMovie) => number {
  const w = cfg.params.dismiss_fatigue_weight;
  const since = now.getTime() - cfg.params.dismiss_fatigue_hours * 3_600_000;
  const recent = model.recent_dismissals
    .filter((d) => new Date(d.at).getTime() >= since)
    .map((d) => catalog.byId.get(d.movie_id))
    .filter((x): x is IndexedMovie => !!x);
  if (!w || !recent.length) return () => 0;
  return (m) => {
    let mx = 0;
    for (const d of recent) {
      const c = cosine(d.hat, m.hat);
      if (c > mx) mx = c;
    }
    return w * mx;
  };
}

/** Receta personal para puntuar sin modificar el modelo (si la persona nunca usó el mood, la semilla). */
export function vibeRecipeOf(model: UserModel, vibe: string | null, cfg: ConfigIndex): AtomVector | null {
  if (!vibe) return null;
  return model.vibes[vibe]?.recipe ?? fromPartial(cfg.vibes.get(vibe)?.recipe);
}

export function buildDeck(input: BuildDeckInput): ActiveDeck {
  const { catalog, model, cfg, now } = input;
  const p = cfg.params;
  const vibe = cfg.vibeKey(input.vibe ?? null);
  const recipe = cfg.recipeFor(input.size ?? p.deck_default_size);
  const vibeRecipe = vibeRecipeOf(model, vibe, cfg);
  const followed = new Set(input.followedCuratorIds ?? []);
  const curated = input.curatedDecks ?? [];

  // Cuántos curadores seguidos guardaron cada película.
  const curatorCount = new Map<string, number>();
  for (const d of curated) {
    if (d.owner_kind !== 'curator' || !followed.has(d.owner_id)) continue;
    for (const id of new Set(d.movie_ids)) curatorCount.set(id, (curatorCount.get(id) ?? 0) + 1);
  }
  const followBonus = (m: IndexedMovie) => (curatorCount.get(m.movie.id) ? p.curator_follow_bonus : 0);
  const fatigue = dismissFatigue(model, catalog, cfg, now);
  const ctx = { model, vibe, vibeRecipe, bonus: (m: IndexedMovie) => followBonus(m) - fatigue(m) };

  const candidates = discoverCandidates(catalog, model, cfg, now, input.filters);
  const scored: Scored[] = candidates.map((m) => scoreMovie(m, ctx, cfg)).sort((a, b) => b.score - a.score);
  const allScores = catalog.list.map((m) => scoreMovie(m, ctx, cfg).score).sort((a, b) => a - b);
  const candScoresAsc = scored.map((s) => s.score).sort((a, b) => a - b);

  const picked: Scored[] = [];
  const pickedDirectors = new Set<string>();
  const diverse = (s: Scored) => {
    if (picked.includes(s)) return false;
    if (p.diversity_unique_director && s.m.movie.directors.some((d) => pickedDirectors.has(d))) return false;
    return picked.every((x) => cosine(x.m.hat, s.m.hat) <= p.diversity_max_cosine);
  };
  const take = (s: Scored | undefined) => {
    if (!s) return undefined;
    picked.push(s);
    s.m.movie.directors.forEach((d) => pickedDirectors.add(d));
    return s;
  };
  const best = (pred: (s: Scored) => boolean = () => true, by: (s: Scored) => number = (s) => s.score) => {
    let out: Scored | undefined;
    for (const s of scored) if (diverse(s) && pred(s) && (!out || by(s) > by(out))) out = s;
    return out;
  };

  const slots = recipe.slots;
  const result: Array<{ s: Scored; role: DeckRole; curator?: string } | undefined> = new Array(slots.length);
  const fillSlot = (i: number, role: DeckRole, s: Scored | undefined, curator?: string) => {
    if (s) result[i] = { s: take(s)!, role, curator };
  };

  // 1) Apertura y cierre: las dos de mayor puntaje.
  slots.forEach((sl, i) => {
    if (sl.rank === 'first') fillSlot(i, 'afin', best());
  });
  slots.forEach((sl, i) => {
    if (sl.rank === 'second') fillSlot(i, 'afin', best());
  });

  // 2) Roles especiales, en orden de posición.
  const top: AtomKey | undefined = topAtoms(model.profile, 1, { positiveOnly: true })[0];
  const scoreCut = percentile(candScoresAsc, p.sorpresa_max_score_percentile);
  slots.forEach((sl, i) => {
    if (result[i]) return;
    if (sl.role === 'creador') {
      // Curadores seguidos; si no hay, el mazo del equipo (system); si tampoco, afín.
      const pools = [curated.filter((d) => d.owner_kind === 'curator' && followed.has(d.owner_id)), curated.filter((d) => d.owner_kind === 'system')];
      for (const pool of pools) {
        const owner = new Map<string, string>();
        for (const d of pool) for (const id of d.movie_ids) if (!owner.has(id)) owner.set(id, d.owner_name);
        const s = best((x) => owner.has(x.m.movie.id));
        if (s) {
          fillSlot(i, 'creador', s, owner.get(s.m.movie.id));
          return;
        }
      }
    } else if (sl.role === 'comodin' && top) {
      // Comparte el rasgo favorito, pero en el resto se parece poco.
      const s = best((x) => x.m.hat[top] >= p.comodin_min_top_atom && x.cosProfile >= p.comodin_min_cosine && x.cosProfile <= p.comodin_max_cosine);
      if (s) {
        fillSlot(i, 'comodin', s);
        return;
      }
    } else if (sl.role === 'sorpresa') {
      const byCurators = best((x) => (curatorCount.get(x.m.movie.id) ?? 0) >= p.curators_for_special);
      const s =
        byCurators ??
        best(
          (x) => x.m.quality >= p.sorpresa_min_quality && x.cosProfile > p.sorpresa_min_cosine && x.score <= scoreCut,
          (x) => x.m.quality,
        );
      if (s) {
        fillSlot(i, 'sorpresa', s);
        return;
      }
    }
  });

  // 3) El resto: afines por puntaje (los roles sin candidato pasan a afín).
  slots.forEach((_, i) => {
    if (!result[i]) fillSlot(i, 'afin', best());
  });

  const cards: DeckCard[] = [];
  result.forEach((r) => {
    if (!r) return;
    cards.push({
      slot: cards.length + 1,
      role: r.role,
      movie_id: r.s.m.movie.id,
      score: r.s.score,
      explanation: explain({ hat: r.s.m.hat, profile: model.profile, vibe, vibeRecipe, role: r.role, curatorName: r.curator }, cfg),
      special_treatment: r.role === 'sorpresa',
      curator_name: r.curator,
      curator_count: curatorCount.get(r.s.m.movie.id) ?? 0,
    });
  });

  if (vibe) ensureVibe(model, vibe, cfg);
  return {
    deck_id: input.deck_id,
    user_id: model.user_id,
    vibe,
    size: recipe.size,
    opened_at: now.toISOString(),
    cards,
    profile_before: copyVector(model.profile),
    special_threshold: percentile(allScores, p.special_match_percentile),
    special_used: false,
  };
}

/** Match especial (9.3): 5 % más alto de su distribución o tres o más curadores seguidos; una vez por mazo. */
export function checkSpecialMatch(deck: ActiveDeck, movie_id: string, cfg: ConfigIndex): boolean {
  const used = deck.cards.filter((c) => c.special).length;
  if (used >= cfg.params.special_match_max_per_deck) return false;
  const card = deck.cards.find((c) => c.movie_id === movie_id);
  if (!card) return false;
  const hit = card.score >= deck.special_threshold || card.curator_count >= cfg.params.curators_for_special;
  if (hit) {
    deck.special_used = true;
    card.special = true;
  }
  return hit;
}
