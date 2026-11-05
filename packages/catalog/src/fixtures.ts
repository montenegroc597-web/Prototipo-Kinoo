// Carga los fixtures de TMDB del repositorio (solo Node).
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TmdbMovieDetails } from './tmdb/types';

export const CATALOG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURES_DIR = path.join(CATALOG_DIR, 'fixtures/tmdb/movie');

export function loadTmdbFixtures(dir = FIXTURES_DIR): TmdbMovieDetails[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
}
