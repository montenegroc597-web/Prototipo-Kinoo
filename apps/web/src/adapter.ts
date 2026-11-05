import type { EventsResult } from '@kinoo/core';
// Adaptador de datos del front. Dos modos:
//  - demo: el motor corre en el navegador, con el catálogo en JSON y los eventos en el almacenamiento local.
//  - supabase: el mismo contrato contra las Edge Functions (si hay URL, clave anónima y sesión).
// El front solo habla de acciones (guardar, descartar…), nunca de gestos.
import type { DeckDTO, EventInput, OnboardingPairDTO, ProfileDTO, WatchFilters, WatchProposalDTO } from '@kinoo/shared';

export interface KinooAdapter {
  mode: 'demo' | 'supabase';
  postEvents(events: EventInput[]): Promise<EventsResult>;
  currentDeck(): Promise<DeckDTO | null>;
  openDeck(o?: { vibe?: string | null; size?: number; only_my_platforms?: boolean }): Promise<DeckDTO>;
  watchProposal(filters?: WatchFilters): Promise<WatchProposalDTO>;
  onboarding(body: unknown): Promise<{ pairs: OnboardingPairDTO[] } | { profile: ProfileDTO }>;
}

/** Cliente de las Edge Functions. accessToken es el JWT de la sesión de Supabase Auth. */
export function supabaseAdapter(o: { url: string; anonKey: string; accessToken: string }): KinooAdapter {
  const call = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(`${o.url}/functions/v1/${path}`, {
      ...init,
      headers: { apikey: o.anonKey, Authorization: `Bearer ${o.accessToken}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body?.error ?? `Error ${r.status}`);
    return body;
  };
  return {
    mode: 'supabase',
    postEvents: (events) => call('events', { method: 'POST', body: JSON.stringify({ events }) }),
    currentDeck: async () => (await call('deck/current')).deck,
    openDeck: async (b = {}) => (await call('deck/open', { method: 'POST', body: JSON.stringify(b) })).deck,
    watchProposal: (f = {}) =>
      call(
        `watch/proposal?${new URLSearchParams(
          Object.entries(f)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        )}`,
      ),
    onboarding: (b) => call('onboarding', { method: 'POST', body: JSON.stringify(b) }),
  };
}
