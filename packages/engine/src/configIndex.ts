import type { ActionWeight, AtomKey, EngineConfig, VibeDef } from '@kinoo/shared';

/** Búsquedas rápidas sobre la configuración. */
export class ConfigIndex {
  readonly vibes = new Map<string, VibeDef>();
  private readonly aliases = new Map<string, string>();
  private readonly weights = new Map<string, ActionWeight>();
  private readonly templates = new Map<string, string>();
  private readonly labels = new Map<AtomKey, string>();

  constructor(readonly config: EngineConfig) {
    for (const v of config.vibes) {
      this.vibes.set(v.key, v);
      for (const a of v.aliases ?? []) this.aliases.set(a, v.key);
    }
    for (const w of config.actionWeights) this.weights.set(`${w.action}:${w.variant}`, w);
    for (const t of config.templates) this.templates.set(t.key, t.text);
    for (const a of config.atoms) this.labels.set(a.key, a.label);
  }

  get params() { return this.config.params; }

  /** Clave canónica de un mood (acepta alias del prototipo, como "sufrir"). null si no existe o no está activo. */
  vibeKey(key: string | null | undefined): string | null {
    if (!key) return null;
    const k = this.vibes.has(key) ? key : this.aliases.get(key);
    if (!k) return null;
    return this.vibes.get(k)?.active ? k : null;
  }

  weight(action: string, variant = 'default'): ActionWeight | undefined {
    return this.weights.get(`${action}:${variant}`) ?? this.weights.get(`${action}:default`);
  }

  template(key: string): string {
    const t = this.templates.get(key);
    if (t === undefined) throw new Error(`Falta la plantilla "${key}" en explanation_templates`);
    return t;
  }

  label(atom: AtomKey): string {
    return this.labels.get(atom) ?? atom;
  }

  recipeFor(size: number) {
    const r = this.config.deckRecipes;
    return r.find((x) => x.size === size) ?? r.find((x) => x.default) ?? r[0]!;
  }
}
