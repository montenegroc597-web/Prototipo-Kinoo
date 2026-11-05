// Ejecuta un caso de uso para una persona: carga su foto, corre el servicio y guarda lo nuevo.
// Lo comparten el servidor HTTP (Node, Supabase Edge, cualquier nube) y las pruebas.
import { KinooEngine } from '@kinoo/engine';
import { derivedRows } from './derived';
import type { KinooRepository } from './ports';
import { KinooService } from './service';

export interface RunnerOptions {
  /** Cuánto se cachea el catálogo y la configuración en memoria (cambian poco). */
  catalogTtlMs?: number;
  now?: () => Date;
  /** Base pública de los pósters locales (por ejemplo, la URL del sitio en GitHub Pages). */
  assetBaseUrl?: string;
}

export class KinooRunner {
  private cache: { at: number; engine: KinooEngine } | null = null;

  constructor(
    private readonly repo: KinooRepository,
    private readonly opts: RunnerOptions = {},
  ) {}

  async engine(): Promise<KinooEngine> {
    const ttl = this.opts.catalogTtlMs ?? 5 * 60_000;
    if (this.cache && Date.now() - this.cache.at < ttl) return this.cache.engine;
    const c = await this.repo.loadCatalog();
    const engine = new KinooEngine(c.config, c.movies, {
      curatedDecks: c.curatedDecks,
      effectiveAtoms: c.effectiveAtoms,
      assetBaseUrl: this.opts.assetBaseUrl,
    });
    this.cache = { at: Date.now(), engine };
    return engine;
  }

  /** userRepo permite leer y guardar a la persona con otro repositorio (por ejemplo, con su propio JWT) y compartir el catálogo en caché. */
  async run<T>(userId: string, fn: (svc: KinooService) => T, userRepo: KinooRepository = this.repo): Promise<T> {
    const [engine, snap] = await Promise.all([this.engine(), userRepo.loadUser(userId)]);
    const svc = new KinooService(engine, snap, this.opts.now);
    const out = fn(svc);
    if (svc.newEvents.length || svc.deckChanged) {
      await userRepo.saveUser(userId, {
        newEvents: svc.newEvents,
        activeDeck: snap.active_deck,
        deckChanged: svc.deckChanged,
        derived: derivedRows(svc.userModel),
      });
    }
    return out;
  }
}
