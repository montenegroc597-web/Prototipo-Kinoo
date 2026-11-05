import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GENRES_ES,
  type SourceMovie,
  type TmdbMovieDetails,
  fetchCatalog,
  fixtureTransport,
  httpTransport,
  kinooId,
  normalize,
  quotaReport,
  selectCatalog,
  slugify,
} from '../src';
import { loadTmdbFixtures } from '../src/fixtures';

const fixtures = loadTmdbFixtures();

describe('simulación de TMDB (fixtures)', () => {
  it('hay 38 fichas con la forma de GET /movie/{id}?append_to_response=credits,keywords,watch/providers,reviews', () => {
    expect(fixtures).toHaveLength(38);
    const genreIds = new Set(GENRES_ES.map((g) => g.id));
    for (const d of fixtures) {
      expect(d._simulado, String(d.id)).toBe(true);
      expect(d.release_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.runtime).toBeGreaterThan(60);
      expect(d.imdb_id === null || /^tt\d{7,8}$/.test(d.imdb_id)).toBe(true);
      for (const g of d.genres) expect(genreIds.has(g.id), `${d.title}: género ${g.id}`).toBe(true);
      expect(d.credits?.crew.some((c) => c.job === 'Director')).toBe(true);
      expect(d.credits?.cast.length).toBeGreaterThanOrEqual(5);
      expect(d.keywords?.keywords.length).toBeGreaterThanOrEqual(5);
      expect(d['watch/providers']?.results.CO?.flatrate?.length).toBeGreaterThan(0);
      expect(d.vote_average).toBeGreaterThan(0);
    }
  });

  it('los ids de TMDB y de IMDb no se repiten', () => {
    expect(new Set(fixtures.map((d) => d.id)).size).toBe(fixtures.length);
    const imdb = fixtures.map((d) => d.imdb_id).filter(Boolean);
    expect(new Set(imdb).size).toBe(imdb.length);
  });

  it('discover filtra, ordena y pagina como TMDB (20 por página)', async () => {
    const t = fixtureTransport(fixtures);
    const p1 = await t.get<{ results: Array<{ popularity: number }>; total_pages: number; total_results: number }>('/discover/movie', {
      watch_region: 'CO',
      sort_by: 'popularity.desc',
      page: 1,
    });
    expect(p1.results).toHaveLength(20);
    expect(p1.total_pages).toBe(2);
    expect(p1.results.map((r) => r.popularity)).toEqual([...p1.results.map((r) => r.popularity)].sort((a, b) => b - a));
    const old = await t.get<{ results: Array<{ release_date: string }> }>('/discover/movie', { 'primary_release_date.lte': '1999-12-31' });
    expect(old.results.length).toBe(fixtures.filter((d) => d.release_date < '2000').length);
    expect(old.results.every((r) => r.release_date <= '1999-12-31')).toBe(true);
    const mx = await t.get<{ results: Array<{ id: number }> }>('/discover/movie', { with_origin_country: 'MX' });
    expect(mx.results.length).toBeGreaterThanOrEqual(3);
    await expect(t.get('/movie/1')).rejects.toThrow(/404/);
  });
});

describe('normalización', () => {
  const interstellar = fixtures.find((d) => d.imdb_id === 'tt0816692') as TmdbMovieDetails;

  it('convierte la ficha de TMDB en la de Kinoo', () => {
    const m = normalize(interstellar, 'CO');
    expect(m.id).toBe('interstellar-2014');
    expect(m.year).toBe(2014);
    expect(m.directors).toEqual(['Christopher Nolan']);
    expect(m.providers.CO).toEqual(expect.arrayContaining(['Netflix', 'Prime Video']));
    expect(m.providers.CO).not.toContain('Amazon Prime Video');
    expect(m.simulated).toBe(true);
  });

  it('ids legibles y estables, también con títulos no latinos', () => {
    expect(slugify('Él Ñandú: ¡Qué tal!')).toBe('el-nandu-que-tal');
    expect(kinooId({ original_title: '기생충', title: 'Parásitos', release_date: '2019-05-30' })).toBe('parasitos-2019');
  });
});

describe('selección con cuotas (12.2)', () => {
  const all = fixtures.map((d) => normalize(d));

  it('respeta las cuotas de latinoamericanas y anteriores al 2000 aunque no sean las más votadas', () => {
    const picked = selectCatalog(all, 20);
    const q = quotaReport(picked);
    expect(q.total).toBe(20);
    expect(q.latam).toBeGreaterThanOrEqual(3); // 15 % de 20
    expect(q.pre2000).toBeGreaterThanOrEqual(4); // 20 % de 20
  });

  it('es determinista', () => {
    expect(selectCatalog(all, 20).map((m) => m.id)).toEqual(selectCatalog([...all].reverse(), 20).map((m) => m.id));
  });

  it('mustInclude asegura las películas del prototipo', () => {
    const picked = selectCatalog(all, 5, { mustInclude: (m: SourceMovie) => m.id === 'rocky-1976' });
    expect(picked.map((m) => m.id)).toContain('rocky-1976');
  });
});

describe('pipeline completo sin red', () => {
  it('fetchCatalog con la simulación reproduce exactamente data/source_movies.json', async () => {
    const got = await fetchCatalog(fixtureTransport(fixtures), { target: fixtures.length, country: 'CO' });
    const committed = JSON.parse(readFileSync(path.resolve(__dirname, '../data/source_movies.json'), 'utf8'));
    expect(got.sort((a, b) => a.id.localeCompare(b.id))).toEqual(committed.movies);
    expect(committed.source).toBe('tmdb_simulado');
  });

  it('el transporte HTTP arma bien las URL y reintenta ante 429', async () => {
    const urls: string[] = [];
    let n = 0;
    const f = (async (u: URL) => {
      urls.push(String(u));
      n++;
      return n === 1 ? new Response('', { status: 429 }) : new Response('{"genres":[]}', { status: 200 });
    }) as unknown as typeof fetch;
    const t = httpTransport('clave-v3', f);
    await t.get('/genre/movie/list', { language: 'es-CO' });
    expect(urls).toHaveLength(2);
    expect(urls[1]).toBe('https://api.themoviedb.org/3/genre/movie/list?language=es-CO&api_key=clave-v3');
  }, 10_000);
});
