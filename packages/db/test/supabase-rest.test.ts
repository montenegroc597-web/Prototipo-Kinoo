import { describe, expect, it } from 'vitest';
import { SupabaseRestRepository } from '../src';

// Sin red: se revisa que las peticiones a PostgREST sean las correctas (tabla, filtros, encabezados, upsert).
function fakeFetch() {
  const calls: Array<{ url: string; method: string; headers: Record<string, string>; body?: unknown }> = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe('SupabaseRestRepository', () => {
  const user = '11111111-1111-4111-8111-111111111111';

  it('lee los datos de la persona con su JWT y filtros por user_id', async () => {
    const { f, calls } = fakeFetch();
    const repo = new SupabaseRestRepository({ url: 'https://x.supabase.co', anonKey: 'anon', accessToken: 'jwt-de-ana', fetch: f });
    const snap = await repo.loadUser(user);
    expect(snap).toEqual({ user_id: user, events: [], active_deck: null, followed_curator_ids: [] });
    expect(calls.map((c) => c.url)).toEqual([
      `https://x.supabase.co/rest/v1/events?select=*&user_id=eq.${user}&order=at.asc`,
      `https://x.supabase.co/rest/v1/active_decks?select=*&user_id=eq.${user}&order=opened_at.desc&limit=1`,
      `https://x.supabase.co/rest/v1/follows?select=followee_id&follower_id=eq.${user}`,
    ]);
    for (const c of calls) {
      expect(c.headers.Authorization).toBe('Bearer jwt-de-ana');
      expect(c.headers.apikey).toBe('anon');
    }
  });

  it('guarda primero los eventos y después lo derivado con upsert', async () => {
    const { f, calls } = fakeFetch();
    const repo = new SupabaseRestRepository({ url: 'https://x.supabase.co', anonKey: 'anon', accessToken: 't', fetch: f });
    await repo.saveUser(user, {
      newEvents: [{ id: 'e1', user_id: user, type: 'dismissed', movie_id: 'm', at: '2026-11-05T00:00:00Z', payload: { flipped: false } }],
      activeDeck: null,
      deckChanged: false,
      derived: { taste: { user_id: user, vector: {} as never, signal_count: 1, formula_version: 'v2', updated_at: 'x' }, vibes: [], states: [] },
    });
    expect(calls[0]).toMatchObject({ method: 'POST', url: 'https://x.supabase.co/rest/v1/events' });
    expect(calls[1]).toMatchObject({ method: 'POST', url: 'https://x.supabase.co/rest/v1/user_taste_profiles?on_conflict=user_id' });
    expect(calls[1]!.headers.Prefer).toContain('merge-duplicates');
    expect(calls).toHaveLength(2);
  });

  it('un error de Supabase se propaga con su mensaje', async () => {
    const f = (async () => new Response('permiso denegado', { status: 403 })) as unknown as typeof fetch;
    const repo = new SupabaseRestRepository({ url: 'https://x.supabase.co', anonKey: 'anon', fetch: f });
    await expect(repo.loadUser(user)).rejects.toThrow(/403 permiso denegado/);
  });
});
