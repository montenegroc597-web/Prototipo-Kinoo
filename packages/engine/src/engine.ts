import type {
  AtomVector,
  CuratedDeck,
  DeckClosingDTO,
  DeckDTO,
  EngineConfig,
  KinooEvent,
  Movie,
  OnboardingPairDTO,
  ProfileDTO,
  SaveResultDTO,
  WatchFilters,
  WatchProposalDTO,
} from '@kinoo/shared';
import { toCardDTO, toDeckDTO } from './cards';
import { type Catalog, buildCatalog } from './catalog';
import { closeDeck } from './closing';
import { ConfigIndex } from './configIndex';
import { type ActiveDeck, buildDeck, checkSpecialMatch } from './deck';
import { archetypeCard, onboardingPairs } from './onboarding';
import { type UserModel, applyEvent, replay } from './profile';
import { proposeWatch } from './watch';

export interface EngineOptions {
  curatedDecks?: CuratedDeck[];
  effectiveAtoms?: Map<string, AtomVector>;
  country?: string;
  /** Base para los pósters locales (ver posterUrl en @kinoo/shared). */
  assetBaseUrl?: string;
}

/**
 * Fachada del motor: lo que usan las Edge Functions y el modo demo.
 * Todo es puro: entra configuración, catálogo y eventos; sale el resultado. No lee archivos ni base de datos.
 */
export class KinooEngine {
  readonly cfg: ConfigIndex;
  readonly catalog: Catalog;
  readonly curatedDecks: CuratedDeck[];
  readonly country: string;
  readonly assetBaseUrl?: string;

  constructor(config: EngineConfig, movies: Movie[], opts: EngineOptions = {}) {
    this.cfg = new ConfigIndex(config);
    this.catalog = buildCatalog(movies, config.params, opts.effectiveAtoms);
    this.curatedDecks = opts.curatedDecks ?? [];
    this.country = opts.country ?? 'CO';
    this.assetBaseUrl = opts.assetBaseUrl;
  }

  /** Recalcula el modelo de una persona desde sus eventos. */
  model(userId: string, events: KinooEvent[]): UserModel {
    return replay(userId, events, this.catalog, this.cfg);
  }

  apply(model: UserModel, e: KinooEvent): UserModel {
    return applyEvent(model, e, this.catalog, this.cfg);
  }

  openDeck(
    model: UserModel,
    o: { deck_id: string; now: Date; vibe?: string | null; size?: number; followedCuratorIds?: string[]; onlyMyPlatforms?: boolean },
  ): ActiveDeck {
    return buildDeck({
      deck_id: o.deck_id,
      catalog: this.catalog,
      model,
      cfg: this.cfg,
      now: o.now,
      size: o.size,
      vibe: o.vibe,
      curatedDecks: this.curatedDecks,
      followedCuratorIds: o.followedCuratorIds,
      filters: o.onlyMyPlatforms ? { providers: model.providers } : undefined,
    });
  }

  deckDTO(deck: ActiveDeck): DeckDTO {
    return toDeckDTO(deck, this.catalog.byId, { country: this.country, assetBaseUrl: this.assetBaseUrl });
  }

  /** Al guardar una carta: ¿es match especial? (muta el mazo para respetar "una vez por mazo"). */
  onSave(deck: ActiveDeck, movieId: string): SaveResultDTO {
    const special = checkSpecialMatch(deck, movieId, this.cfg);
    return special ? { special_match: true, message: 'Esta es muy tú.' } : { special_match: false };
  }

  close(deck: ActiveDeck, model: UserModel): DeckClosingDTO {
    return closeDeck(deck, model, this.catalog, this.cfg, this.assetBaseUrl);
  }

  watch(model: UserModel, now: Date, filters?: WatchFilters): WatchProposalDTO {
    const d = proposeWatch({ catalog: this.catalog, model, cfg: this.cfg, now, filters });
    return {
      status: d.status,
      relaxed: d.relaxed,
      filters: d.filters,
      ...(d.notice ? { notice: d.notice } : {}),
      ...(d.movie
        ? {
            card: toCardDTO(
              d.movie,
              { slot: 1, role: 'afin', explanation: d.explanation ?? '', special_treatment: false },
              { country: this.country, assetBaseUrl: this.assetBaseUrl },
            ),
          }
        : {}),
    };
  }

  onboarding(model: UserModel, n?: number): OnboardingPairDTO[] {
    return onboardingPairs(this.catalog, model, this.cfg, n).map((p) => ({
      left_movie_id: p.left.movie.id,
      right_movie_id: p.right.movie.id,
      left_title: p.left.movie.title,
      right_title: p.right.movie.title,
    }));
  }

  profile(model: UserModel): ProfileDTO {
    return { user_id: model.user_id, vector: model.profile, signal_count: model.signal_count, archetype: archetypeCard(model, this.cfg) };
  }
}
