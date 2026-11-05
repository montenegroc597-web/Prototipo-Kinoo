// Catálogo sintético para el simulador: películas generadas a partir de "tipos" de cine con ruido.
// Permite probar el motor sin depender del catálogo real (F4).
import { ATOM_KEYS, type AtomVector, type Movie, type PartialAtomVector } from '@kinoo/shared';
import { makeRng } from '../src/rng';

export const KINDS: Record<string, PartialAtomVector> = {
  blockbuster: { frenetica: 0.9, agil: 0.7, escala_epica: 0.9, tensa: 0.6, neon: 0.4 },
  comedia_familiar: { humor: 0.9, luminosa: 0.8, reconfortante: 0.8, agil: 0.6, pastel: 0.4, carga_emocional: 0.5 },
  drama_intimo: { pausada: 0.8, intimidad: 0.9, carga_emocional: 0.9, melancolica: 0.7, calida: 0.7 },
  contemplativa_bn: { contemplativa: 0.9, monocromatica: 0.8, complejidad: 0.6, melancolica: 0.5 },
  terror: { inquietante: 0.9, tensa: 0.8, sombria: 0.8, cruda: 0.4 },
  surreal: { onirica: 0.9, inquietante: 0.6, complejidad: 0.7, neon: 0.5 },
  thriller_cerebral: { complejidad: 0.9, tensa: 0.8, sombria: 0.5, agil: 0.5 },
  romance_luminoso: { luminosa: 0.8, calida: 0.7, intimidad: 0.6, humor: 0.5, pastel: 0.6 },
  cine_social: { cruda: 0.9, sombria: 0.6, carga_emocional: 0.7, intimidad: 0.5 },
  neo_noir: { neon: 0.9, sombria: 0.7, tensa: 0.7, frenetica: 0.5 },
  aventura_clasica: { escala_epica: 0.8, luminosa: 0.6, agil: 0.7, reconfortante: 0.5 },
  animacion_emotiva: { carga_emocional: 0.8, reconfortante: 0.8, luminosa: 0.7, humor: 0.6, pastel: 0.5 },
};

const PROVIDERS = ['Netflix', 'Prime Video', 'Max', 'Disney+', 'Apple TV'];

function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
}

export function synthCatalog(n = 300, seed = Number(process.env.KINOO_SIM_SEED || 42)): Movie[] {
  const r = makeRng(seed);
  const kinds = Object.keys(KINDS);
  const out: Movie[] = [];
  for (let i = 0; i < n; i++) {
    const kind = kinds[i % kinds.length]!;
    const second = r() < 0.35 ? kinds[Math.floor(r() * kinds.length)]! : null;
    const atoms = {} as AtomVector;
    for (const k of ATOM_KEYS) {
      let base = KINDS[kind]![k] ?? 0.12;
      if (second && KINDS[second]![k]) base = Math.max(base, 0.6 * KINDS[second]![k]!);
      atoms[k] = Math.max(0, Math.min(1, base + 0.12 * gauss(r)));
    }
    const provs = PROVIDERS.filter(() => r() < 0.35);
    out.push({
      id: `sim-${i}`, title: `Película ${kind} ${i}`, year: 1960 + Math.floor(r() * 66), runtime_min: 80 + Math.floor(r() * 90),
      genres: [kind], directors: [`dir-${Math.floor(r() * 180)}`], countries: ['US'], original_language: 'en',
      vote_average: 5 + r() * 3.8, vote_count: Math.floor(50 + r() * r() * 20000), atoms,
      hook: 'UNA HISTORIA PARA PROBAR EL MOTOR', pillars: { ritmo: '-', tono: '-', historia: '-', visual: '-' },
      providers: { CO: provs.length ? provs : ['Netflix'] }, tagger: { model: 'sintetico', prompt_version: 'sim', tagged_at: '2026-11-05T00:00:00Z' },
      source: 'semilla_manual', poster_path: null,
    });
  }
  return out;
}
