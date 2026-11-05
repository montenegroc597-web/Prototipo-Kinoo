import { ATOM_KEYS, type AtomKey, type ArchetypeDTO } from '@kinoo/shared';
import type { Catalog, IndexedMovie } from './catalog';
import type { ConfigIndex } from './configIndex';
import type { UserModel } from './profile';
import { cosine, fromPartial, topAtoms } from './vector';

export interface OnboardingPair { left: IndexedMovie; right: IndexedMovie; atoms: AtomKey[] }

/**
 * Duelos "¿Esta o esta?" (7.3): pares de rasgos opuestos que más información dan.
 * Información de un par = Σ |m̂ₐ − m̂ᵦ| · (1 − |Uᵢ|) · (1 − cobertura previa del átomo).
 * Se eligen de un grupo de películas conocidas (mejor calidad y más votos) para que la persona pueda opinar.
 */
export function onboardingPairs(catalog: Catalog, model: UserModel, cfg: ConfigIndex, n?: number, poolSize = 60): OnboardingPair[] {
  const count = Math.max(cfg.params.onboarding_min_pairs, Math.min(cfg.params.onboarding_max_pairs, n ?? cfg.params.onboarding_min_pairs));
  const pool = [...catalog.list]
    .sort((a, b) => (b.movie.vote_count * b.quality) - (a.movie.vote_count * a.quality))
    .slice(0, poolSize);
  const coverage: Record<string, number> = {};
  const used = new Set<string>();
  const out: OnboardingPair[] = [];
  for (let r = 0; r < count; r++) {
    let best: { a: IndexedMovie; b: IndexedMovie; gain: number } | null = null;
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i]!, b = pool[j]!;
      if (used.has(a.movie.id) || used.has(b.movie.id)) continue;
      // Opuestos: que no se parezcan.
      if (cosine(a.hat, b.hat) > 0.3) continue;
      let gain = 0;
      for (const k of ATOM_KEYS) gain += Math.abs(a.hat[k] - b.hat[k]) * (1 - Math.abs(model.profile[k])) * (1 - Math.min(1, coverage[k] ?? 0));
      if (!best || gain > best.gain) best = { a, b, gain };
    }
    if (!best) break;
    used.add(best.a.movie.id); used.add(best.b.movie.id);
    const atoms = [...ATOM_KEYS].filter((k) => Math.abs(best!.a.hat[k] - best!.b.hat[k]) > 0.3);
    for (const k of ATOM_KEYS) coverage[k] = (coverage[k] ?? 0) + Math.abs(best.a.hat[k] - best.b.hat[k]);
    out.push({ left: best.a, right: best.b, atoms });
  }
  return out;
}

/** Arquetipo de perfil (7.4): el arquetipo más parecido al perfil. */
export function archetypeCard(model: UserModel, cfg: ConfigIndex): ArchetypeDTO {
  let best = cfg.config.archetypes[0]!, bestCos = -Infinity;
  for (const a of cfg.config.archetypes) {
    const c = cosine(model.profile, fromPartial(a.recipe));
    if (c > bestCos) { best = a; bestCos = c; }
  }
  return { key: best.key, name: best.name, top_atoms: topAtoms(model.profile, 3, { positiveOnly: true }) };
}
