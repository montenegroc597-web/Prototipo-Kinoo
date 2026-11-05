// Simulación de Camilo usando la app de verdad: navegador, inicio de sesión (camilo / 1234), botones de Descubrir,
// Ver y Calificar. Decide con un gusto oculto (personas.ts) y guarda lo que la app aprendió de él.
// Uso: npm run build && npm run sim:camilo   (en la nube: PW_CHROMIUM_PATH=/opt/pw-browsers/chromium)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { type Page, chromium } from 'playwright';
import { PERSONAS } from '../../../packages/engine/sim/personas';
import { affinity, engine } from '../../../packages/engine/sim/profiling';
import { cosine, fromPartial, topAtoms } from '../../../packages/engine/src/vector';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const PORT = 4190;
const BASE = `http://localhost:${PORT}/Prototipo-Kinoo/`;
const DECKS = Number(process.env.DECKS ?? 4);
const camilo = PERSONAS.find((p) => p.key === 'camilo')!;
const taste = fromPartial(camilo.taste);
const aff = engine.catalog.list.map((m) => affinity(taste, m)).sort((a, b) => a - b);
const thr = aff[Math.floor(0.75 * (aff.length - 1))]!;
const likes = (id: string) => affinity(taste, engine.catalog.byId.get(id)!) >= thr;
const shots = path.join(root, 'docs/img/simulacion');

type KD = {
  discoverCards(): Array<{ movie_id: string; title: string; similar: string; kicker: string }>;
  profile(): { vector: Record<string, number>; signal_count: number; archetype: { name: string; top_atoms: string[] } };
  lastClosing(): { learned: string; saved_posters: unknown[]; ready_tonight: boolean } | null;
  watchQueue(m: string | null): { ids: string[]; films: Record<string, { t: string; why: string }> } | null;
  reset(): void;
};
const kd = <T>(page: Page, fn: (k: KD) => T): Promise<T> => page.evaluate(`(${fn.toString()})(window.KinooDemo)`) as Promise<T>;
const ready = (page: Page) => page.waitForFunction(() => !!(window as unknown as { KinooDemo?: unknown }).KinooDemo);

const server = spawn('node', [path.join(root, 'apps/web/scripts/serve.mjs'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, hasTouch: true });

const log: Array<Record<string, unknown>> = [];
try {
  // Inicio de sesión de la demo, como lo haría Camilo.
  await page.goto(`${BASE}entrar.html`);
  await page.getByLabel('Usuario').fill('camilo');
  await page.getByLabel('Clave').fill('1234');
  await page.screenshot({ path: path.join(shots, '01-entrar.jpg'), type: 'jpeg', quality: 72 });
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/Flujo1_Descubrir/);
  await ready(page);
  await kd(page, (k) => k.reset());
  await page.reload();
  await ready(page);

  for (let d = 1; d <= DECKS; d++) {
    const cards = await kd(page, (k) => k.discoverCards());
    if (d === 1) await page.screenshot({ path: path.join(shots, '02-primera-carta.jpg'), type: 'jpeg', quality: 72 });
    const decisions: Array<{ title: string; role?: string; liked: boolean; explanation: string }> = [];
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]!;
      const liked = likes(c.movie_id);
      decisions.push({ title: c.title, liked, explanation: c.similar });
      await page.getByRole('button', { name: liked ? 'Quiero verla' : 'No me interesa' }).click();
      await page.waitForTimeout(450);
    }
    const closing = await kd(page, (k) => k.lastClosing());
    if (d === 1) await page.screenshot({ path: path.join(shots, '03-cierre-del-mazo.jpg'), type: 'jpeg', quality: 72 });
    const afterDeck = await kd(page, (k) => k.profile());

    // Esa noche, Ver: la propuesta del motor, salir a la plataforma y calificar al volver.
    await page.goto(`${BASE}kinoo-flujo/FlujoV1_Feed.dc.html`);
    await ready(page);
    const q = await kd(page, (k) => k.watchQueue('sufrir'));
    const proposalId = q?.ids[0];
    if (d === 1) await page.screenshot({ path: path.join(shots, '04-ver-propuesta.jpg'), type: 'jpeg', quality: 72 });
    let watched: { title: string; reaction: string } | null = null;
    if (proposalId && q) {
      await page.getByText('verla →', { exact: true }).click();
      await page.getByText(/^(Abrir en|Alquilar en)/).click();
      await page.waitForURL(/FlujoV2_Abriendo/);
      await page.goto(`${BASE}kinoo-flujo/FlujoV4_Calificar.dc.html`);
      await ready(page);
      const a = affinity(taste, engine.catalog.byId.get(proposalId)!);
      const level = a >= thr + 0.1 ? 3 : a >= thr - 0.1 ? 2 : 1; // ¡Me encantó! · Estuvo bien · No era para mí
      const slider = page.getByRole('slider', { name: 'Qué te pareció' });
      for (let s = 3; s > level; s--) {
        await slider.focus();
        await page.keyboard.press('ArrowLeft');
      }
      await page.locator('a[href="FlujoV5_Version.dc.html"]').click();
      await page.waitForURL(/FlujoV5_Version/);
      watched = { title: q.films[proposalId]!.t, reaction: ['', 'not_for_me', 'liked', 'loved'][level]! };
    }
    await page.goto(`${BASE}kinoo-flujo/Flujo1_Descubrir.dc.html`);
    await ready(page);
    const prof = await kd(page, (k) => k.profile());
    const top = Object.entries(prof.vector)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 4)
      .map(([k, v]) => `${k} ${v.toFixed(2)}`);
    log.push({
      deck: d,
      liked: decisions.filter((x) => x.liked).length,
      cards: decisions,
      learned: closing?.learned,
      watched,
      signals: prof.signal_count,
      archetype: prof.archetype.name,
      top,
      cosToTaste: cosine(fromPartial(prof.vector), taste),
      afterDeckSignals: afterDeck.signal_count,
    });
    console.log(
      `Mazo ${d}: ${decisions.filter((x) => x.liked).length}/10 le gustaron · "${closing?.learned}" · vio ${watched?.title} (${watched?.reaction}) · ${prof.archetype.name} · coseno ${cosine(fromPartial(prof.vector), taste).toFixed(2)} · ${top.join(', ')}`,
    );
  }
  await page.goto(`${BASE}kinoo-flujo/FlujoV1_Feed.dc.html`);
  await ready(page);
  await page.screenshot({ path: path.join(shots, '05-ver-al-final.jpg'), type: 'jpeg', quality: 72 });
} finally {
  await browser.close();
  server.kill();
}
const trueTop = topAtoms(taste, 5, { positiveOnly: true });
writeFileSync(path.join(root, 'packages/engine/sim/camilo-app.json'), JSON.stringify({ persona: camilo, trueTop, threshold: thr, decks: log }, null, 2) + '\n');
console.log(`Gusto oculto: ${trueTop.join(', ')} → packages/engine/sim/camilo-app.json y docs/img/simulacion/`);
