import { ATOM_KEYS, type AtomVector, type KinooEvent } from '@kinoo/shared';
import type { ConfigIndex } from './configIndex';
import { clamp } from './vector';

export interface Signal { movie_id: string; signal: number; eta: number }

/**
 * Traduce un evento a señales de aprendizaje usando action_weights.
 * Devuelve [] para eventos sin señal (abrir mazo, voltear, salir a la plataforma…).
 */
export function signalsOf(e: KinooEvent, cfg: ConfigIndex): Signal[] {
  const w = (action: string, variant?: string) => cfg.weight(action, variant);
  const one = (movie: string | undefined, action: string, variant?: string): Signal[] => {
    const x = w(action, variant);
    return movie && x && x.eta > 0 && x.signal !== 0 ? [{ movie_id: movie, signal: x.signal, eta: x.eta }] : [];
  };
  switch (e.type) {
    case 'saved_intent': return one(e.movie_id, 'saved_intent', e.payload.flipped ? 'flipped' : 'unflipped');
    case 'dismissed': return one(e.movie_id, 'dismissed');
    case 'marked_seen': return one(e.movie_id, 'marked_seen', e.payload.reaction ?? 'default');
    case 'rewatch_intent': return one(e.movie_id, 'rewatch_intent');
    case 'watch_confirmed': {
      const v = e.payload.reaction === 'loved' && e.payload.rewatch ? 'loved_rewatch' : e.payload.reaction;
      return one(e.movie_id, 'watch_confirmed', v);
    }
    case 'onboarding_choice':
      return [...one(e.payload.chosen_movie_id, 'onboarding_choice', 'chosen'), ...one(e.payload.rejected_movie_id, 'onboarding_choice', 'rejected')];
    case 'watch_skipped': return one(e.movie_id, 'watch_skipped');
    default: return [];
  }
}

/**
 * Regla de aprendizaje (sección 7.1), promedio móvil exponencial:
 * para cada átomo con m̂ᵢ > τ: objetivoᵢ = clamp(w·m̂ᵢ, −1, 1);  Uᵢ ← Uᵢ + η·(objetivoᵢ − Uᵢ).
 * Los átomos que la película no tiene no se tocan (no se aprende de ausencias).
 */
export function applySignal(u: AtomVector, hat: AtomVector, signal: number, eta: number, tau: number): AtomVector {
  const out = { ...u };
  for (const k of ATOM_KEYS) {
    if (hat[k] <= tau) continue;
    const target = clamp(signal * hat[k], -1, 1);
    out[k] = out[k] + eta * (target - out[k]);
  }
  return out;
}
