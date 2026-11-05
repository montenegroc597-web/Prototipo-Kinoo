import type { AtomVector, KinooEvent, Movie, PartialAtomVector } from '@kinoo/shared';
import { fromPartial } from '../src/vector';

let n = 0;
export function movie(id: string, atoms: PartialAtomVector, extra: Partial<Movie> = {}): Movie {
  const base: AtomVector = fromPartial({});
  for (const k of Object.keys(base) as Array<keyof AtomVector>) base[k] = 0.1;
  return {
    id,
    title: id,
    year: 2000,
    runtime_min: 110,
    genres: ['Drama'],
    directors: [`dir-${id}`],
    countries: ['US'],
    original_language: 'en',
    vote_average: 7,
    vote_count: 1000,
    atoms: { ...base, ...atoms } as AtomVector,
    hook: 'UNA FRASE',
    pillars: { ritmo: 'a', tono: 'b', historia: 'c', visual: 'd' },
    providers: { CO: ['Netflix'] },
    tagger: { model: 't', prompt_version: 'v', tagged_at: '2026-11-01T00:00:00Z' },
    source: 'semilla_manual',
    poster_path: null,
    ...extra,
  };
}

export function ev<T extends KinooEvent['type']>(type: T, payload: Extract<KinooEvent, { type: T }>['payload'], extra: Partial<KinooEvent> = {}): KinooEvent {
  n += 1;
  return { id: `e${n}`, user_id: 'u', type, at: new Date(Date.parse('2026-11-01T00:00:00Z') + n * 60_000).toISOString(), payload, ...extra } as KinooEvent;
}
