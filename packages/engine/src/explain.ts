import { ATOM_KEYS, type AtomKey, type AtomVector } from '@kinoo/shared';
import type { ConfigIndex } from './configIndex';
import { norm } from './vector';

/** Regla dura (sección 11): nunca números ni %. */
export function hasNumbers(text: string): boolean {
  return /[0-9%]/.test(text);
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

/** Garantiza la regla dura: si una plantilla editada trae números, se usa una frase segura. */
function safe(text: string): string {
  return hasNumbers(text) ? 'Creemos que te puede gustar.' : text;
}

/** Contribución de cada átomo: cᵢ = Uᵢ × m̂ᵢ (+ Rᵢ × m̂ᵢ si hay mood). Devuelve los dos mayores positivos. */
export function topContributors(hat: AtomVector, profile: AtomVector, recipe: AtomVector | null, n = 2): AtomKey[] {
  const c: Array<[AtomKey, number]> = ATOM_KEYS.map((k) => [k, profile[k] * hat[k] + (recipe ? recipe[k] * hat[k] : 0)]);
  return c.filter(([, v]) => v > 1e-6).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

export interface ExplainInput {
  hat: AtomVector;
  profile: AtomVector;
  vibe: string | null;
  vibeRecipe: AtomVector | null;
  role?: 'afin' | 'creador' | 'comodin' | 'sorpresa';
  curatorName?: string;
}

/** Explicación en palabras de por qué aparece una película. */
export function explain(input: ExplainInput, cfg: ConfigIndex): string {
  const { hat, profile, vibe, vibeRecipe, role, curatorName } = input;
  const atoms = topContributors(hat, profile, vibe ? vibeRecipe : null);
  const labels = atoms.map((a) => cfg.label(a));
  if (role === 'sorpresa') return safe(cfg.template('role_sorpresa'));
  if (role === 'creador' && curatorName) {
    const base = fill(cfg.template('role_creador'), { curator: curatorName });
    return safe(labels[0] ? `${base} ${fill(cfg.template('social'), { curator: curatorName, a: labels[0] })}` : base);
  }
  if (role === 'comodin') {
    const top = topContributors(hat, profile, null, 1)[0];
    if (top) return safe(fill(cfg.template('role_comodin'), { a: cfg.label(top) }));
  }
  if (!labels.length) return safe(cfg.template(norm(profile) < 1e-9 && !vibe ? 'cold_start' : 'no_overlap'));
  if (vibe) {
    const mood = (cfg.vibes.get(vibe)?.name ?? vibe).toLowerCase();
    const t = labels.length > 1 ? 'vibe' : 'vibe_single';
    return safe(fill(cfg.template(t), { mood, a: labels[0]!, b: labels[1] ?? '' }));
  }
  const t = labels.length > 1 ? 'profile' : 'profile_single';
  return safe(fill(cfg.template(t), { a: labels[0]!, b: labels[1] ?? '' }));
}
