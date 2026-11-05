import { ATOM_KEYS, isAtomKey } from '@kinoo/shared';
import { describe, expect, it } from 'vitest';
import { defaultConfig as c } from '../src';

// Protege los JSON que edita el equipo: si un cambio rompe una regla, esta prueba lo dice en palabras.
describe('configuración editable (packages/config/data)', () => {
  it('los 21 átomos, sin repetir y en el orden de la especificación', () => {
    expect(c.atoms.map((a) => a.key)).toEqual([...ATOM_KEYS]);
  });

  it('cada receta de mood usa átomos que existen y pesos entre −1 y +1', () => {
    for (const v of c.vibes) {
      for (const [k, w] of Object.entries(v.recipe)) {
        expect(isAtomKey(k), `${v.key}: átomo desconocido "${k}"`).toBe(true);
        expect(Math.abs(w as number), `${v.key}.${k}`).toBeLessThanOrEqual(1);
      }
      expect(v.definition.length, `${v.key}: falta la definición en una frase`).toBeGreaterThan(10);
    }
  });

  it('los alias de moods no se repiten entre moods', () => {
    const all = c.vibes.flatMap((v) => [v.key, ...(v.aliases ?? [])]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('cada receta de mazo tiene tantas posiciones como su tamaño, una apertura y un cierre', () => {
    for (const r of c.deckRecipes) {
      expect(r.slots, `mazo de ${r.size}`).toHaveLength(r.size);
      expect(r.slots.filter((s) => s.rank === 'first')).toHaveLength(1);
      expect(r.slots.filter((s) => s.rank === 'second')).toHaveLength(1);
    }
    expect(c.deckRecipes.filter((r) => r.default)).toHaveLength(1);
  });

  it('las señales están entre −2 y +2 y las velocidades entre 0 y 1', () => {
    for (const w of c.actionWeights) {
      expect(Math.abs(w.signal), `${w.action}/${w.variant}`).toBeLessThanOrEqual(2);
      expect(w.eta).toBeGreaterThanOrEqual(0);
      expect(w.eta).toBeLessThanOrEqual(1);
    }
  });

  it('ninguna plantilla tiene números ni %, y solo usa los huecos conocidos', () => {
    for (const t of c.templates) {
      expect(/[0-9%]/.test(t.text), `plantilla ${t.key}`).toBe(false);
      for (const m of t.text.matchAll(/\{(\w+)\}/g)) expect(['a', 'b', 'mood', 'curator']).toContain(m[1]);
    }
  });

  it('los arquetipos usan átomos que existen', () => {
    for (const a of c.archetypes) for (const k of Object.keys(a.recipe)) expect(isAtomKey(k), `${a.key}: ${k}`).toBe(true);
  });
});
