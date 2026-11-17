import { type Page, expect, test } from '@playwright/test';
import { CAMILO_ID, loginAsCamilo } from './helpers';

// Modo demo: Descubrir y Ver del prototipo conectados al motor v2 (en el navegador, con almacenamiento local).
type KD = {
  discoverCards(): Array<{ movie_id: string; title: string; premise: string; similar: string }>;
  events(): Array<{ type: string; movie_id?: string; payload: Record<string, unknown> }>;
  profile(): { vector: Record<string, number>; signal_count: number };
  reset(): void;
};
// Lo que el modo demo guardó en el almacenamiento local (sirve también en pantallas que no cargan el motor).
const stored = (page: Page) =>
  page.evaluate((id) => JSON.parse(localStorage.getItem(`kinoo.demo.v2:${id}`) || '{"events":[]}'), CAMILO_ID) as Promise<{
    events: Array<{ type: string; movie_id?: string; payload: Record<string, unknown> }>;
  }>;

test('abrir un mazo, guardar una carta, verla en Ver y calificar "Me encantó" cambia el perfil', async ({ page }) => {
  await loginAsCamilo(page);
  await page.evaluate(() => (window as unknown as { KinooDemo: KD }).KinooDemo.reset());
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { KinooDemo?: unknown }).KinooDemo);

  // 1. Las cartas salen del motor y la carta no muestra porcentajes.
  const cards = await page.evaluate(() => (window as unknown as { KinooDemo: KD }).KinooDemo.discoverCards());
  expect(cards).toHaveLength(10);
  await expect(page.getByText(cards[0]!.premise, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('% contigo')).toHaveCount(0);
  expect(cards.every((c) => !/[0-9%]/.test(c.similar))).toBe(true);
  const opened = await page.evaluate(() => (window as unknown as { KinooDemo: KD }).KinooDemo.events().map((e) => e.type));
  expect(opened).toContain('deck_opened');

  // 2. Guardar con intención (botón "Quiero verla"): el back recibe saved_intent, no un gesto.
  const before = await page.evaluate(() => (window as unknown as { KinooDemo: KD }).KinooDemo.profile());
  await page.getByRole('button', { name: 'Quiero verla' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { KinooDemo: KD }).KinooDemo.events()
          .filter((e) => e.type === 'saved_intent')
          .map((e) => e.movie_id),
      ),
    )
    .toEqual([cards[0]!.movie_id]);
  await expect(page.getByText(cards[1]!.premise, { exact: true }).first()).toBeVisible();

  // 3. En Ver (B7c), la cartelera sale de la mano: la película guardada, sin porcentajes.
  await page.evaluate(() => localStorage.removeItem('kinoo.ver.mood'));
  await page.goto('kinoo-flujo/FlujoV1_Feed.dc.html');
  await page.waitForFunction(() => !!(window as unknown as { KinooDemo?: unknown }).KinooDemo);
  await expect(page.locator('[data-k=title]')).toHaveText(cards[0]!.title);
  await expect(page.locator('[data-k=quote]')).not.toBeEmpty();
  await expect(page.getByText(/% contigo/)).toHaveCount(0);
  // Ticket → hoja de plataformas → "Abrir en …" → Abriendo.
  await page.locator('[data-k=ticket]').click();
  await expect(page.locator('[data-k=sheet]')).toBeVisible();
  const plat = (await page.locator('[data-k=plat] b').first().innerText()).trim();
  await page.locator('[data-k=open]').click();
  await page.waitForURL(/FlujoV2_Abriendo/);
  const started = (await stored(page)).events.filter((e) => e.type === 'watch_started');
  expect(started.map((e) => e.movie_id)).toEqual([cards[0]!.movie_id]);
  expect(started[0]!.payload.provider).toBe(plat);

  // 4. Calificar: "¡Me encantó!" (nivel por defecto). V4 solo anota el nivel; V5 guarda una vez con Continuar.
  await page.goto('kinoo-flujo/FlujoV4_Calificar.dc.html');
  await page.waitForFunction(() => !!(window as unknown as { KinooDemo?: unknown }).KinooDemo);
  await expect(page.getByText('¡Me encantó!')).toBeVisible();
  await page.locator('a[href="FlujoV5_Version.dc.html"]').click();
  await page.waitForURL(/FlujoV5_Version/);
  expect((await stored(page)).events.filter((e) => e.type === 'watch_confirmed')).toHaveLength(0);
  await page.locator('a[href="FlujoV6_Gracias.dc.html"]').click();
  await page.waitForURL(/FlujoV6_Gracias/);
  const confirmed = (await stored(page)).events.filter((e) => e.type === 'watch_confirmed');
  expect(confirmed).toHaveLength(1);
  expect(confirmed[0]!.movie_id).toBe(cards[0]!.movie_id);
  expect(confirmed[0]!.payload.reaction).toBe('loved');
  await page.waitForFunction(() => !!(window as unknown as { KinooDemo?: unknown }).KinooDemo);
  const after = await page.evaluate(() => (window as unknown as { KinooDemo: KD }).KinooDemo.profile());
  expect(after.signal_count).toBeGreaterThan(before.signal_count);
  expect(after.vector).not.toEqual(before.vector);
});

test('sin el motor, las pantallas siguen funcionando con sus datos de ejemplo', async ({ page }) => {
  await page.route('**/_kinoo/kinoo-demo.js', (r) => r.fulfill({ status: 404, body: '' }));
  await page.goto('kinoo-flujo/Flujo1_Descubrir.dc.html');
  await expect(page.getByText('Un padre cruza el universo para volver.')).toBeVisible();
  // Ni siquiera los datos de ejemplo muestran afinidad en cifras.
  await expect(page.getByText(/% contigo/)).toHaveCount(0);
});
