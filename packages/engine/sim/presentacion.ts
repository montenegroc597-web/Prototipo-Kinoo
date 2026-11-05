// Genera docs/presentacion/como-funciona-kinoo.html desde la plantilla, la configuración y el catálogo,
// para que la explicación gráfica use siempre los mismos pesos que el motor. Uso: npm run docs:presentacion
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultConfig } from '@kinoo/config';
import { ATOM_KEYS, type Movie } from '@kinoo/shared';
import pilot from '../../catalog/data/movies.pilot.json';
import { buildCatalog } from '../src/catalog';

const r = (x: number) => Math.round(x * 100) / 100;

export function presentationData() {
  const cfg = defaultConfig;
  const cat = buildCatalog((pilot as unknown as { movies: Movie[] }).movies, cfg.params);
  return {
    params: cfg.params,
    weights: cfg.actionWeights.map(({ action, variant, signal, eta, reason }) => ({ action, variant, signal, eta, reason })),
    archetypes: cfg.archetypes.map(({ name, recipe }) => ({ name, recipe })),
    atoms: ATOM_KEYS.map((k) => {
      const a = cfg.atoms.find((x) => x.key === k);
      return { k, label: a?.label ?? k, theme: a?.theme ?? k, family: a?.dimension ?? '' };
    }),
    vibes: cfg.vibes
      .filter((v) => v.active)
      .map((v) => ({ key: v.key, name: v.name, definition: v.definition, recipe: v.recipe, q: v.quality_weight ?? null })),
    movies: cat.list.map((x) => ({
      id: x.movie.id,
      t: x.movie.title,
      y: x.movie.year,
      g: x.movie.genres.slice(0, 2),
      d: x.movie.directors[0] ?? '',
      q: r(x.quality),
      h: ATOM_KEYS.map((k) => r(x.hat[k])),
    })),
    mean: ATOM_KEYS.map((k) => r(cat.stats.mean[k])),
  };
}

export const PRESENTATION_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/presentacion');

if (process.argv[1]?.endsWith('presentacion.ts')) {
  const tpl = readFileSync(path.join(PRESENTATION_DIR, 'plantilla.html'), 'utf8');
  const html = tpl.replace('/*DATA*/', JSON.stringify(presentationData()));
  writeFileSync(path.join(PRESENTATION_DIR, 'como-funciona-kinoo.html'), html);
  console.log('docs/presentacion/como-funciona-kinoo.html listo');
}
