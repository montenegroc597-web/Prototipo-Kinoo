import { type BillboardDTO, type BillboardFilmDTO, type MoodDTO, type ProviderDTO, type ShelfItemDTO, fitText, posterUrl } from '@kinoo/shared';
import { availableOn } from './candidates';
import type { Catalog, IndexedMovie } from './catalog';
import type { ConfigIndex } from './configIndex';
import { vibeRecipeOf } from './deck';
import { explain, fill, safe } from './explain';
import type { UserModel } from './profile';
import { scoreMovie } from './score';
import { topAtoms } from './vector';
import { handMovies, watchBonus } from './watch';

export interface PresentOptions {
  country: string;
  assetBaseUrl?: string;
}

/** "1 h 44", "2 h", "45 min". */
export function runtimeText(min: number): string {
  if (!min || min < 60) return `${Math.max(0, Math.round(min || 0))} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/**
 * Colores de la carta sin póster. Determinista: el átomo estético más fuerte de la película
 * (de los que tienen trío en params.poster_palettes) elige el trío; si ninguno llega a palette_min_atom, "default".
 */
export function paletteFor(m: IndexedMovie, cfg: ConfigIndex): [string, string, string] {
  const pals = cfg.params.poster_palettes ?? {};
  const fallback = pals.default ?? ['#3a2f2a', '#14100e', '#e9d8c4'];
  let best: string | null = null;
  let bestV = cfg.params.palette_min_atom ?? 0.3;
  for (const k of Object.keys(pals)) {
    if (k === 'default') continue;
    const v = (m.movie.atoms as Record<string, number>)[k];
    if (typeof v === 'number' && v >= bestV && (best === null || v > bestV)) {
      best = k;
      bestV = v;
    }
  }
  return [...(best ? pals[best]! : fallback)] as [string, string, string];
}

/**
 * Cuándo, en palabras relativas: "hoy", "ayer", "hace 3 días", "hace 2 semanas", "hace un mes", "hace 5 meses", "hace un año".
 * Lleva cifras de tiempo (como el diseño), nunca de afinidad. Lo más largo ("hace 11 meses") cabe en shelf_when_max.
 */
export function relativeWhen(at: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(at).getTime()) / 86_400_000);
  if (days < 1) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 14) return 'hace una semana';
  if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
  if (days < 60) return 'hace un mes';
  if (days < 365) return `hace ${Math.min(11, Math.floor(days / 30))} meses`;
  if (days < 730) return 'hace un año';
  return `hace ${Math.floor(days / 365)} años`;
}

/** Clave estable de una plataforma para buscar su logo: "Prime Video" → "prime_video", "Disney+" → "disney_plus". */
export function providerKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\+/g, '_plus')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Un mood del selector. null = "todas" (sin mood). */
export function moodOf(vibe: string | null, cfg: ConfigIndex): MoodDTO {
  const p = cfg.params;
  if (!vibe)
    return { key: 'todas', name: fitText(cfg.template('mood_all_name'), p.mood_name_max), desc: fitText(cfg.template('mood_all_desc'), p.mood_desc_max) };
  const v = cfg.vibes.get(vibe)!;
  return { key: v.key, name: fitText(v.name, p.mood_name_max), desc: fitText(v.tagline ?? v.definition, p.mood_desc_max) };
}

/** Selector de mood de Ver: "todas" primero y luego los moods activos, en el orden de vibes.json. */
export function moodList(cfg: ConfigIndex): MoodDTO[] {
  return [moodOf(null, cfg), ...cfg.config.vibes.filter((v) => v.active).map((v) => moodOf(v.key, cfg))];
}

/** "1 h 44 · Drama · Romance": quita géneros hasta que quepa en watch_meta_max. */
function metaLine(m: IndexedMovie, max: number): string {
  const dur = runtimeText(m.movie.runtime_min);
  for (let n = Math.min(2, m.movie.genres.length); n >= 0; n--) {
    const line = [dur, ...m.movie.genres.slice(0, n)].join(' · ');
    if (line.length <= max) return line;
  }
  return fitText(dur, max);
}

/** Plataformas reales de la película en el país (catálogo), primero las de la persona. Sin precios ni alquiler inventados. */
function providersOf(m: IndexedMovie, model: UserModel, cfg: ConfigIndex, country: string): ProviderDTO[] {
  const max = cfg.params.watch_provider_note_max;
  const here = m.movie.providers?.[country] ?? [];
  const mine = model.providers?.list ?? [];
  const item = (name: string, tpl: string): ProviderDTO => ({ key: providerKey(name), name, note: fitText(cfg.template(tpl), max), rent: false });
  if (!mine.length) return here.map((name) => item(name, 'provider_unknown'));
  return [
    ...here.filter((x) => mine.includes(x)).map((n) => item(n, 'provider_mine')),
    ...here.filter((x) => !mine.includes(x)).map((n) => item(n, 'provider_other')),
  ];
}

/** Tamaño del título de la cartelera (px): corto o largo según watch_title_size_short_max. */
export function titleSizeFor(title: string, cfg: ConfigIndex): number {
  const p = cfg.params;
  return title.length <= p.watch_title_size_short_max ? p.watch_title_size_short : p.watch_title_size_long;
}

const capitalize = (t: string) => (t ? t.charAt(0).toLocaleUpperCase('es') + t.slice(1) : t);

/**
 * Cartelera de Ver para un mood (o "todas"): toda la mano, ordenada por el mismo puntaje de Ver
 * (perfil + receta del mood + calidad + bonos de frescura, match especial y estrella).
 * - Solo lo que está en sus plataformas (si las dijo). Si nada queda: empty_platforms.
 * - Con mood: solo lo que encaja con la receta (coseno ≥ watch_vibe_min_cosine). Si nada encaja: empty_mood.
 * - Lo calificado no está: pasó a la repisa. Lo que pidió cambiar ("otra") va al final.
 */
export function buildBillboard(input: {
  catalog: Catalog;
  model: UserModel;
  cfg: ConfigIndex;
  now: Date;
  vibe: string | null;
  opts: PresentOptions;
}): BillboardDTO {
  const { catalog, model, cfg, now, opts } = input;
  const p = cfg.params;
  const vibe = cfg.vibeKey(input.vibe);
  const mood = moodOf(vibe, cfg);
  const empty = (status: BillboardDTO['status'], tpl: string): BillboardDTO => ({
    mood,
    films: [],
    status,
    notice: fitText(safe(cfg.template(tpl), ''), p.billboard_notice_max) || null,
  });

  const hand = handMovies(model, catalog);
  if (!hand.length) return empty('empty_hand', 'watch_empty_hand');
  const available = model.providers?.list.length ? hand.filter((x) => availableOn(x.m, model.providers!)) : hand;
  if (!available.length) return empty('empty_platforms', 'watch_empty_platforms');

  const vibeRecipe = vibeRecipeOf(model, vibe, cfg);
  const pool = vibeRecipe ? available.filter((x) => scoreMovie(x.m, { model, vibe, vibeRecipe }, cfg).cosVibe >= p.watch_vibe_min_cosine) : available;
  if (!pool.length) return empty('empty_mood', 'billboard_empty_mood');

  const ctx = { model, vibe, vibeRecipe, bonus: watchBonus(model, cfg, now) };
  const ranked = pool
    .map((x) => ({ x, s: scoreMovie(x.m, ctx, cfg).score, skipped: model.watch_skipped_ids.has(x.m.movie.id) }))
    .sort((a, b) => Number(a.skipped) - Number(b.skipped) || b.s - a.s || a.x.m.movie.title.localeCompare(b.x.m.movie.title));

  const films: BillboardFilmDTO[] = ranked.slice(0, p.billboard_max_films).map(({ x }) => {
    const m = x.m;
    const why = explain({ hat: m.hat, profile: model.profile, vibe, vibeRecipe }, cfg);
    const title = fitText(m.movie.title, p.watch_title_max);
    return {
      id: m.movie.id,
      title,
      title_size: titleSizeFor(title, cfg),
      meta: metaLine(m, p.watch_meta_max),
      quote: capitalize(fitText(why, p.watch_why_max)),
      poster_url: posterUrl(m.movie.poster_path, { assetBaseUrl: opts.assetBaseUrl }),
      palette: paletteFor(m, cfg),
      starred: !!x.st.starred,
      providers: providersOf(m, model, cfg, model.providers?.country ?? opts.country),
      runtime_min: m.movie.runtime_min,
    };
  });
  return { mood, films, status: 'ok', notice: null };
}

function ratingKey(s: { reaction?: string; rewatch?: boolean; fell_asleep?: boolean }): string {
  if (s.fell_asleep) return 'rating_asleep';
  if (s.reaction === 'loved') return s.rewatch ? 'rating_loved_rewatch' : 'rating_loved';
  return s.reaction === 'liked' ? 'rating_liked' : 'rating_not_for_me';
}

/** Repisa de Ver: lo que vio y calificó (watch_confirmed), lo más reciente primero, con una razón para volver a verla. */
export function buildShelf(input: { catalog: Catalog; model: UserModel; cfg: ConfigIndex; now: Date; opts: PresentOptions }): ShelfItemDTO[] {
  const { catalog, model, cfg, now, opts } = input;
  const p = cfg.params;
  return [...model.states.values()]
    .filter((s) => s.on_shelf && s.confirmed_at && catalog.byId.has(s.movie_id))
    .sort((a, b) => (a.confirmed_at! < b.confirmed_at! ? 1 : a.confirmed_at! > b.confirmed_at! ? -1 : 0))
    .map((s) => {
      const m = catalog.byId.get(s.movie_id)!;
      const atom = topAtoms(m.hat, 1, { positiveOnly: true })[0] ?? topAtoms(m.movie.atoms, 1)[0];
      const backKey = s.reaction === 'loved' ? 'back_loved' : s.reaction === 'liked' ? 'back_liked' : 'back_not_for_me';
      const back = safe(fill(cfg.template(backKey), { a: atom ? cfg.label(atom) : '' }), safe(cfg.template('back_not_for_me'), ''));
      const title = fitText(m.movie.title, p.shelf_title_max);
      return {
        id: m.movie.id,
        title,
        title_size: titleSizeFor(title, cfg),
        poster_url: posterUrl(m.movie.poster_path, { assetBaseUrl: opts.assetBaseUrl }),
        palette: paletteFor(m, cfg),
        meta: metaLine(m, p.watch_meta_max),
        runtime_min: m.movie.runtime_min,
        providers: providersOf(m, model, cfg, model.providers?.country ?? opts.country),
        when: fitText(relativeWhen(s.confirmed_at!, now), p.shelf_when_max),
        rating: fitText(safe(cfg.template(ratingKey(s)), ''), p.shelf_rating_max),
        back: fitText(back, p.shelf_back_max),
      };
    });
}
