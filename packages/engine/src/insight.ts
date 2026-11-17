import { ATOM_KEYS, type AtomKey, type InsightDTO, type LevelWord, fitText } from '@kinoo/shared';
import type { ConfigIndex } from './configIndex';
import { vibeRecipeOf } from './deck';
import { fill, safe } from './explain';
import { archetypeCard } from './onboarding';
import type { UserModel } from './profile';
import { cosine } from './vector';

const level = (v: number, high: number, mid: number): LevelWord => (v >= high ? 'alto' : v >= mid ? 'medio' : 'bajo');

/**
 * "Lo que el mazo dice de ti" (Resumen, Perfil y Ver). Sale del perfil, que se recalcula desde los eventos reales.
 * - Rasgos: los átomos más altos del perfil (hasta 3), con nivel alto / medio / bajo según params insight_trait_*.
 * - Moods: los moods cuya receta personal más se parece al perfil (coseno), con nivel según params insight_mood_*.
 * - Con menos de insight_min_signals señales (o sin ningún gusto positivo) no opina: ready = false y textos vacíos.
 * Nunca entrega números: los niveles son palabras y la frase pasa por safe().
 */
export function buildInsight(model: UserModel, cfg: ConfigIndex): InsightDTO {
  const p = cfg.params;
  const kicker = fitText(safe(cfg.template('insight_kicker'), ''), p.insight_kicker_max);
  const empty_text = fitText(safe(cfg.template('insight_empty'), ''), p.insight_empty_max);
  const notReady: InsightDTO = { ready: false, title: '', kicker, body: '', traits: [], moods: [], archetype: { key: '', name: '' }, empty_text };
  if (model.signal_count < p.insight_min_signals) return notReady;

  const top: AtomKey[] = [...ATOM_KEYS]
    .filter((k) => model.profile[k] >= p.insight_trait_min)
    .sort((a, b) => model.profile[b] - model.profile[a])
    .slice(0, 3);
  if (!top.length) return notReady;
  const traits = top.map((k) => ({
    key: k,
    label: fitText(cfg.theme(k), p.insight_trait_max),
    level: level(model.profile[k], p.insight_trait_high, p.insight_trait_mid),
  }));

  const moods = [...cfg.vibes.values()]
    .filter((v) => v.active)
    .map((v) => ({ v, c: cosine(model.profile, vibeRecipeOf(model, v.key, cfg)!) }))
    .filter((x) => x.c > 0)
    .sort((a, b) => b.c - a.c || a.v.key.localeCompare(b.v.key))
    .slice(0, 3)
    .map(({ v, c }) => ({ key: v.key, name: fitText(v.name, p.mood_name_max), level: level(c, p.insight_mood_high, p.insight_mood_mid) }));

  const arch = archetypeCard(model, cfg);
  const title = fitText(safe(cfg.templateOr(`insight_title_${arch.key}`, arch.name), arch.name).toLocaleUpperCase('es'), p.insight_title_max);

  const [a, b] = top.map((k) => cfg.label(k));
  const mood = moods[0]?.level === 'alto' ? moods[0].name.toLowerCase() : null;
  const raw = b
    ? fill(cfg.template(mood ? 'insight_body_mood' : 'insight_body'), { a: a!, b, mood: mood ?? '' })
    : fill(cfg.template('insight_body_single'), { a: a! });
  // Si la frase con mood no cabe, se usa la versión sin mood antes de recortar.
  const body0 = mood && raw.length > p.insight_body_max ? fill(cfg.template('insight_body'), { a: a!, b: b ?? '' }) : raw;
  const body = fitText(safe(body0, safe(cfg.template('deck_learned_none'), '')), p.insight_body_max);

  return { ready: true, title, kicker, body, traits, moods, archetype: { key: arch.key, name: arch.name }, empty_text };
}
