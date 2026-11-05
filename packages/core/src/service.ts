import type { ActiveDeck, KinooEngine, UserModel } from '@kinoo/engine';
// Servicio de la API de Kinoo: la lógica de cada endpoint, sin saber dónde se guardan los datos.
// Trabaja sobre una "foto" de los datos de la persona (eventos y mazo abierto). Quien lo usa
// (Edge Function o modo demo) carga la foto, llama al método y guarda lo nuevo (newEvents, deckChanged).
import {
  type DeckClosingDTO,
  type DeckDTO,
  EVENT_TYPES,
  type EventInput,
  type KinooEvent,
  type OnboardingPairDTO,
  type ProfileDTO,
  type SaveResultDTO,
  type WatchFilters,
  type WatchProposalDTO,
} from '@kinoo/shared';

export interface UserSnapshot {
  user_id: string;
  events: KinooEvent[];
  active_deck: ActiveDeck | null;
  followed_curator_ids?: string[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface EventsResult {
  accepted: number;
  /** Respuesta a cada evento que la tiene: match especial al guardar, cierre al completar el mazo. */
  results: Array<{ id: string; save?: SaveResultDTO; closing?: DeckClosingDTO }>;
}

let counter = 0;
const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `ev-${Date.now()}-${++counter}`);

export class KinooService {
  readonly newEvents: KinooEvent[] = [];
  deckChanged = false;
  private model: UserModel;

  constructor(
    readonly engine: KinooEngine,
    readonly snap: UserSnapshot,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.model = engine.model(snap.user_id, snap.events);
  }

  get userModel(): UserModel {
    return this.model;
  }

  private record(input: EventInput): KinooEvent {
    if (!EVENT_TYPES.includes(input.type)) throw new ApiError(400, `Tipo de evento desconocido: ${String(input.type)}`);
    if (input.movie_id && !this.engine.catalog.byId.has(input.movie_id)) throw new ApiError(400, `Película desconocida: ${input.movie_id}`);
    const e = {
      ...input,
      id: input.id ?? newId(),
      user_id: this.snap.user_id,
      at: input.at ?? this.now().toISOString(),
      payload: input.payload ?? {},
    } as KinooEvent;
    this.snap.events.push(e);
    this.newEvents.push(e);
    if (e.type === 'undo') this.model = this.engine.model(this.snap.user_id, this.snap.events);
    else this.engine.apply(this.model, e);
    return e;
  }

  /** POST /events */
  postEvents(inputs: EventInput[]): EventsResult {
    if (!Array.isArray(inputs) || !inputs.length) throw new ApiError(400, 'Se espera una lista de eventos');
    if (inputs.length > 100) throw new ApiError(400, 'Máximo 100 eventos por envío');
    const results: EventsResult['results'] = [];
    for (const raw of inputs) {
      const input = { ...raw, context: { ...(raw.context ?? {}) } } as EventInput;
      let save: SaveResultDTO | undefined;
      const deck = this.snap.active_deck;
      // Match especial: se decide al guardar una carta del mazo abierto y queda en el contexto del evento.
      if (input.type === 'saved_intent' && deck && input.movie_id && deck.cards.some((c) => c.movie_id === input.movie_id)) {
        save = this.engine.onSave(deck, input.movie_id);
        input.context!.special_match = save.special_match;
        this.deckChanged = true;
      }
      const e = this.record(input);
      let closing: DeckClosingDTO | undefined;
      if (e.type === 'deck_completed' && deck && deck.deck_id === e.payload.deck_id) {
        closing = this.engine.close(deck, this.model);
        deck.completed_at = e.at;
        this.deckChanged = true;
      }
      if (save || closing) results.push({ id: e.id, ...(save ? { save } : {}), ...(closing ? { closing } : {}) });
    }
    return { accepted: inputs.length, results };
  }

  /** GET /deck/current: el mazo abierto y sin terminar, o null. */
  currentDeck(): DeckDTO | null {
    const d = this.snap.active_deck;
    return d && !d.completed_at ? this.engine.deckDTO(d) : null;
  }

  /** POST /deck/open */
  openDeck(o: { vibe?: string | null; size?: number; only_my_platforms?: boolean } = {}): DeckDTO {
    const size = o.size ?? this.engine.cfg.params.deck_default_size;
    if (![5, 10, 20].includes(size)) throw new ApiError(400, 'El tamaño del mazo debe ser 5, 10 o 20');
    const vibe = o.vibe ? this.engine.cfg.vibeKey(o.vibe) : null;
    if (o.vibe && !vibe) throw new ApiError(400, `Mood desconocido: ${o.vibe}`);
    const deck = this.engine.openDeck(this.model, {
      deck_id: newId(),
      now: this.now(),
      vibe,
      size,
      followedCuratorIds: this.snap.followed_curator_ids,
      onlyMyPlatforms: o.only_my_platforms,
    });
    this.snap.active_deck = deck;
    this.deckChanged = true;
    this.record({ type: 'deck_opened', payload: { deck_id: deck.deck_id, vibe, size }, context: { surface: 'discover', vibe } } as EventInput);
    return this.engine.deckDTO(deck);
  }

  /** GET /watch/proposal */
  watchProposal(filters: WatchFilters = {}): WatchProposalDTO {
    const p = this.engine.watch(this.model, this.now(), filters);
    if (p.card)
      this.record({
        type: 'watch_proposed',
        movie_id: p.card.movie_id,
        payload: { filters },
        context: { surface: 'watch', vibe: filters.vibe ?? null, filters },
      } as EventInput);
    return p;
  }

  /** POST /onboarding: { step: 'pairs' } | { step: 'platforms', country, providers } | { step: 'choices', choices: [...] } */
  onboarding(
    body:
      | { step: 'pairs'; n?: number }
      | { step: 'platforms'; country: string; providers: string[] }
      | { step: 'choices'; choices: Array<{ chosen_movie_id: string; rejected_movie_id: string }> },
  ): { pairs: OnboardingPairDTO[] } | { profile: ProfileDTO } {
    if (body.step === 'pairs') return { pairs: this.engine.onboarding(this.model, body.n) };
    if (body.step === 'platforms') {
      if (!body.country || !Array.isArray(body.providers)) throw new ApiError(400, 'Faltan país o plataformas');
      this.record({ type: 'platforms_set', payload: { country: body.country, providers: body.providers }, context: { surface: 'onboarding' } } as EventInput);
      return { profile: this.profile() };
    }
    if (body.step === 'choices') {
      for (const c of body.choices ?? []) {
        this.record({ type: 'onboarding_choice', movie_id: c.chosen_movie_id, payload: c, context: { surface: 'onboarding' } } as EventInput);
      }
      return { profile: this.profile() };
    }
    throw new ApiError(400, 'Paso de onboarding desconocido');
  }

  profile(): ProfileDTO {
    return this.engine.profile(this.model);
  }
}
