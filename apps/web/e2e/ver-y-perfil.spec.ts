import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type Page, expect, test } from '@playwright/test';
import { auditTexts } from './auditoria-textos';
import { loginAsCamilo } from './helpers';

// De punta a punta con el puente real (window.KinooDemo): lo que el mazo dice de ti, la cartelera de Ver (B7c),
// la estrella, la hoja de plataformas, calificar → repisa → "Repetirla", Abriendo/Gracias y Resumen/Ticket.
type Movie = { id: string; title: string; atoms: Record<string, number>; providers: Record<string, string[]> };
const pilot = JSON.parse(readFileSync(path.resolve(process.cwd(), '../../packages/catalog/data/movies.pilot.json'), 'utf8')) as { movies: Movie[] };
const byId = new Map(pilot.movies.map((m) => [m.id, m]));
const RECIPES: Record<string, string[]> = {
  romantico: ['intimidad', 'calida', 'carga_emocional'],
  nocturno: ['inquietante', 'onirica', 'sombria'],
  explorador: ['agil', 'humor', 'neon', 'escala_epica'],
};
/** Las n películas que más se parecen a un estilo (promedio de sus átomos). */
const topOf = (style: string, n: number, skip: string[] = []) =>
  pilot.movies
    .filter((m) => !skip.includes(m.id))
    .map((m) => [m.id, RECIPES[style]!.reduce((a, k) => a + (m.atoms[k] ?? 0), 0) / RECIPES[style]!.length] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id]) => id);

type Insight = {
  ready: boolean;
  title: string;
  body: string;
  empty_text: string;
  traits: Array<{ key: string; label: string; level: string }>;
  moods: Array<{ key: string; name: string; level: string }>;
  archetype: { key: string; name: string };
};
type Film = { id: string; title: string; providers: Array<{ name: string }>; starred: boolean };
type Board = { mood: { key: string; name: string }; films: Film[]; status: string };
type KD = {
  reset(): void;
  insight(): Insight;
  moods(): Array<{ key: string; name: string }>;
  billboard(k: string | null): Board;
  shelf(): Array<{ id: string; title: string; rating: string }>;
  lastClosing(): { counts: { want: number; seen: number; pass: number }; vibe: string | null } | null;
  events(): Array<{ type: string; movie_id?: string; payload: Record<string, unknown> }>;
  adapter: { postEvents(e: unknown[]): Promise<unknown> };
};
const kd = <T>(page: Page, fn: (K: KD, arg: never) => T, arg?: unknown) =>
  page.evaluate(([f, a]) => new Function('K', 'a', `return (${f})(K, a)`)((window as unknown as { KinooDemo: KD }).KinooDemo, a), [
    fn.toString(),
    arg,
  ] as const) as Promise<Awaited<T>>;

async function freshSession(page: Page) {
  await loginAsCamilo(page);
  await kd(page, (K) => {
    K.reset();
    localStorage.removeItem('kinoo.ver.mood');
  });
}
async function swipe(page: Page, save: string[], pass: string[]) {
  await kd(
    page,
    (K, a: { save: string[]; pass: string[] }) =>
      K.adapter.postEvents([
        ...a.save.map((id) => ({ type: 'saved_intent', movie_id: id, payload: { flipped: true } })),
        ...a.pass.map((id) => ({ type: 'dismissed', movie_id: id, payload: { flipped: false } })),
      ]),
    { save, pass } as never,
  );
}
async function open(page: Page, screen: string) {
  await page.goto(`kinoo-flujo/${screen}.dc.html`);
  await page.waitForFunction(() => !!(window as unknown as { KinooDemo?: unknown }).KinooDemo);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}
/** Ningún texto visible con afinidad en cifras: "93 %", "82/100", "match". */
async function noAffinityNumbers(page: Page, where: string) {
  const text = await page.evaluate(() => document.body.innerText);
  expect(text, `${where}: cifra con %`).not.toMatch(/\d\s*%/);
  expect(text, `${where}: "/100"`).not.toMatch(/\/\s*100/);
  expect(text, `${where}: "match"`).not.toMatch(/\bmatch\b/i);
}
async function toBottom(page: Page) {
  await page
    .locator('.kscroll')
    .first()
    .evaluate((e) => e.scrollTo(0, e.scrollHeight));
  await page.waitForTimeout(300);
}

test('lo que el mazo dice de ti: vacío sin señales y cambia con el estilo de los swipes', async ({ page }) => {
  await freshSession(page);

  // 1. Sin señales: Perfil y Ver muestran el texto vacío, sin arquetipo inventado.
  const empty = await kd(page, (K) => K.insight());
  expect(empty.ready).toBe(false);
  expect(empty.empty_text.length).toBeGreaterThan(0);
  await open(page, 'Flujo2c_Perfil');
  await expect(page.locator('[data-k=perfil-archetype]')).toHaveText(/por descubrir/i);
  await expect(page.getByText(empty.empty_text).first()).toBeVisible();
  await noAffinityNumbers(page, 'Perfil vacío');
  await open(page, 'FlujoV1_Feed');
  await expect(page.locator('[data-k=empty]')).toBeVisible();
  await toBottom(page);
  await expect(page.locator('[data-k=insight-empty]')).toHaveText(empty.empty_text);
  await expect(page.locator('[data-k=insight-title]')).toHaveCount(0);
  await noAffinityNumbers(page, 'Ver vacío');

  // 2. Estilo romántico: guarda las más íntimas y cálidas, deja pasar las más inquietantes.
  const roman = topOf('romantico', 8);
  const noct = topOf('nocturno', 8, roman);
  await swipe(page, roman, noct);
  const a = await kd(page, (K) => K.insight());
  expect(a.ready).toBe(true);
  expect(a.archetype.key).toBe('romantico');
  // Rasgos coherentes: al menos uno de la receta del estilo, ninguno del estilo descartado.
  expect(a.traits.some((t) => RECIPES.romantico!.includes(t.key))).toBe(true);
  expect(a.traits.some((t) => RECIPES.nocturno!.includes(t.key))).toBe(false);
  for (const t of a.traits) expect(['alto', 'medio', 'bajo']).toContain(t.level);
  await open(page, 'Flujo2c_Perfil');
  await expect(page.locator('[data-k=perfil-archetype]')).toHaveText(a.archetype.name);
  await expect(page.getByText(a.body).first()).toBeVisible();
  for (const t of a.traits) await expect(page.getByText(t.label, { exact: true }).first()).toBeVisible();
  await noAffinityNumbers(page, 'Perfil romántico');
  await open(page, 'FlujoV1_Feed');
  await toBottom(page);
  await expect(page.locator('[data-k=insight-title]')).toHaveText(a.title);
  await expect(page.locator('[data-k=insight-body]')).toHaveText(a.body);
  await expect(page.locator('[data-k=insight-trait]')).toHaveCount(a.traits.length);
  await expect(page.locator('[data-k=insight-mood]')).toHaveCount(a.moods.length);
  await noAffinityNumbers(page, 'Ver romántico');
  // Con el perfil lleno, los textos de lo aprendido tampoco se salen ni se montan (Ver abajo, Perfil, Resumen).
  const problems = (await page.evaluate(auditTexts, null)).map((f) => `Ver · ${f}`);
  for (const sc of ['Flujo2c_Perfil', 'Flujo2_Resumen']) {
    await open(page, sc);
    for (const f of await page.evaluate(auditTexts, null)) problems.push(`${sc} · ${f}`);
    await toBottom(page);
    for (const f of await page.evaluate(auditTexts, null)) problems.push(`${sc} abajo · ${f}`);
  }
  expect([...new Set(problems)], problems.join('\n')).toEqual([]);

  // 3. Otro estilo (al revés): el arquetipo y los rasgos cambian.
  await kd(page, (K) => K.reset());
  await swipe(page, noct, roman);
  const b = await kd(page, (K) => K.insight());
  expect(b.ready).toBe(true);
  expect(b.archetype.key).toBe('nocturno');
  expect(b.title).not.toBe(a.title);
  expect(b.traits.map((t) => t.key)).not.toEqual(a.traits.map((t) => t.key));
  expect(b.traits.some((t) => RECIPES.nocturno!.includes(t.key))).toBe(true);
  await open(page, 'Flujo2c_Perfil');
  await expect(page.locator('[data-k=perfil-archetype]')).toHaveText(b.archetype.name);
  await noAffinityNumbers(page, 'Perfil nocturno');
  await open(page, 'FlujoV1_Feed');
  await toBottom(page);
  await expect(page.locator('[data-k=insight-title]')).toHaveText(b.title);
  await open(page, 'Flujo2_Resumen');
  await expect(page.getByText(b.title, { exact: true }).first()).toBeVisible();
  await noAffinityNumbers(page, 'Resumen nocturno');
});

test('cartelera: el mood cambia las películas, la estrella la pone primera y la hoja trae solo sus plataformas', async ({ page }) => {
  await freshSession(page);
  // Una mano variada: de los tres estilos.
  const hand = [...topOf('romantico', 4), ...topOf('nocturno', 4), ...topOf('explorador', 4)];
  await swipe(page, [...new Set(hand)], []);
  await open(page, 'FlujoV1_Feed');
  const all = await kd(page, (K) => K.billboard('todas'));
  expect(all.status).toBe('ok');
  await expect(page.locator('[data-k=mood-name]')).toHaveText(all.mood.name);
  await expect(page.locator('[data-k=title]')).toHaveText(all.films[0]!.title);

  // 1. Cambiar de mood cambia las películas (en el orden del back).
  const moods = await kd(page, (K) => K.moods());
  let changed = 0;
  for (let i = 1; i < moods.length; i++) {
    await page.locator('[data-k=mood-next]').click();
    await expect(page.locator('[data-k=mood-name]')).toHaveText(moods[i]!.name);
    const b = await kd(page, (K, k: string) => K.billboard(k), moods[i]!.key as never);
    if (b.status === 'ok') {
      await expect(page.locator('[data-k=title]')).toHaveText(b.films[0]!.title);
      if (b.films.map((f) => f.id).join() !== all.films.map((f) => f.id).join()) changed++;
    } else await expect(page.locator('[data-k=empty]')).toBeVisible();
  }
  expect(changed).toBeGreaterThan(0);
  await page.locator('[data-k=mood-next]').click();
  await expect(page.locator('[data-k=mood-name]')).toHaveText(all.mood.name);
  await noAffinityNumbers(page, 'Ver cartelera');

  // 2. Estrella sobre la tercera: queda primera (la próxima vez que se pide la cartelera).
  await page.waitForTimeout(700);
  await page.locator('[data-k=next]').click();
  await page.waitForTimeout(700);
  await page.locator('[data-k=next]').click();
  await page.waitForTimeout(700);
  const third = all.films[2]!;
  await expect(page.locator('[data-k=title]')).toHaveText(third.title);
  await page.locator('[data-k=star]').click();
  await expect(page.locator('[data-k=star]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-k=toast]')).toContainText('queda primera');
  expect((await kd(page, (K) => K.events())).filter((e) => e.type === 'super_liked').map((e) => e.movie_id)).toEqual([third.id]);
  const after = await kd(page, (K) => K.billboard('todas'));
  expect(after.films[0]!.id).toBe(third.id);
  expect(after.films[0]!.starred).toBe(true);
  await open(page, 'FlujoV1_Feed');
  await expect(page.locator('[data-k=title]')).toHaveText(third.title);

  // 3. Hoja de plataformas: exactamente las plataformas reales de la película en el catálogo (Colombia).
  await page.locator('[data-k=ticket]').click();
  await expect(page.locator('[data-k=sheet]')).toBeVisible();
  const names = (await page.locator('[data-k=plat] b').allInnerTexts()).map((t) => t.trim());
  expect(names.sort()).toEqual([...(byId.get(third.id)!.providers.CO ?? [])].sort());
  await noAffinityNumbers(page, 'Hoja de plataformas');
});

test('calificar saca la película de la cartelera, la pone en la repisa y "Repetirla" la devuelve; Abriendo y Gracias dicen lo real', async ({ page }) => {
  await freshSession(page);
  // Una película con más de una plataforma, para elegir la segunda (no la primera por defecto).
  const pick = pilot.movies.filter((m) => (m.providers.CO ?? []).length >= 2).map((m) => m.id);
  const hand = [pick[0]!, ...topOf('romantico', 4, [pick[0]!])];
  await swipe(page, hand, []);
  // Estrella para que la elegida sea la primera de la cartelera.
  await kd(page, (K, id: string) => (K as unknown as { star(id: string, on: boolean): unknown }).star(id, true), pick[0] as never);
  await open(page, 'FlujoV1_Feed');
  const film = (await kd(page, (K) => K.billboard('todas'))).films[0]!;
  expect(film.id).toBe(pick[0]);
  await expect(page.locator('[data-k=title]')).toHaveText(film.title);

  // Ver → hoja → segunda plataforma → Abriendo con esa plataforma.
  await page.locator('[data-k=ticket]').click();
  await page.locator('[data-k=plat]').nth(1).click();
  const plat = film.providers[1]!.name;
  await expect(page.locator('[data-k=open]')).toContainText(plat);
  await page.locator('[data-k=open]').click();
  await page.waitForURL(/FlujoV2_Abriendo/);
  await expect(page.getByText(`Te llevamos a ${plat}`)).toBeVisible();

  // Calificar: "Estuvo bien" (una a la izquierda del nivel por defecto) → Versión → Continuar → Gracias.
  await open(page, 'FlujoV4_Calificar');
  await expect(page.getByText(film.title).first()).toBeVisible();
  await page.getByRole('slider', { name: 'Qué te pareció' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText('Estuvo bien', { exact: true }).first()).toBeVisible();
  await page.locator('a[href="FlujoV5_Version.dc.html"]').click();
  await page.waitForURL(/FlujoV5_Version/);
  await page.locator('a[href="FlujoV6_Gracias.dc.html"]').click();
  await page.waitForURL(/FlujoV6_Gracias/);
  await page.waitForFunction(() => !!(window as unknown as { KinooDemo?: unknown }).KinooDemo);
  const confirmed = (await kd(page, (K) => K.events())).filter((e) => e.type === 'watch_confirmed');
  expect(confirmed).toHaveLength(1);
  expect(confirmed[0]!.payload.reaction).toBe('liked');
  const shelf = await kd(page, (K) => K.shelf());
  expect(shelf.map((s) => s.id)).toEqual([film.id]);
  // Gracias: la película, la plataforma elegida y la calificación real (la misma de la repisa).
  await expect(page.getByText(film.title.toUpperCase()).first()).toBeVisible();
  await expect(page.getByText(plat, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(shelf[0]!.rating, { exact: true }).first()).toBeVisible();
  await noAffinityNumbers(page, 'Gracias');

  // Ver: ya no está en la cartelera; está en la repisa.
  await open(page, 'FlujoV1_Feed');
  expect((await kd(page, (K) => K.billboard('todas'))).films.map((f) => f.id)).not.toContain(film.id);
  await expect(page.locator('[data-k=title]')).not.toHaveText(film.title);
  const item = page.locator('[data-k=shelf-item]');
  await expect(item).toHaveCount(1);
  await expect(item).toHaveAttribute('aria-label', `Volver a ver ${shelf[0]!.title}`);

  // "Repetirla": modo ya vistas → ticket → hoja → abrir. La película vuelve a la cartelera.
  await item.click();
  await page.waitForTimeout(600);
  await expect(page.locator('[data-k=title]')).toHaveText(shelf[0]!.title);
  await expect(page.locator('[data-k=ticket]')).toContainText(/repetirla/i);
  await page.locator('[data-k=ticket]').click();
  await page.locator('[data-k=open]').click();
  await page.waitForURL(/FlujoV2_Abriendo/);
  await page.waitForFunction(() => !!(window as unknown as { KinooDemo?: unknown }).KinooDemo);
  const ev = await kd(page, (K) => K.events());
  expect(ev.filter((e) => e.type === 'rewatch_intent').map((e) => e.movie_id)).toEqual([film.id]);
  expect((await kd(page, (K) => K.billboard('todas'))).films.map((f) => f.id)).toContain(film.id);
  expect((await kd(page, (K) => K.shelf())).map((s) => s.id)).not.toContain(film.id);
});

test('Resumen y Ticket muestran los mismos conteos que el cierre real del mazo', async ({ page }) => {
  await freshSession(page);
  await page.goto('kinoo-flujo/Flujo1_Descubrir.dc.html');
  await page.waitForFunction(() => !!(window as unknown as { KinooDemo?: unknown }).KinooDemo);
  await page.evaluate(() => document.fonts.ready);
  // 10 cartas: 4 "Quiero verla", 1 "Ya la vi" (hay que revelarla primero) y 5 "No me interesa".
  const plan = ['want', 'want', 'seen', 'want', 'pass', 'pass', 'want', 'pass', 'pass', 'pass'];
  for (const a of plan) {
    await page.waitForTimeout(500);
    if (a === 'seen') {
      const card = (await page.locator('[style*="cursor: grab"]').first().boundingBox())!;
      await page.mouse.click(card.x + card.width / 2, card.y + 40);
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: 'Ya la vi' }).click();
    } else await page.getByRole('button', { name: a === 'want' ? 'Quiero verla' : 'No me interesa' }).click();
  }
  // Cierre del mazo en Descubrir.
  await expect(page.getByText('dejaste pasar').first()).toBeVisible();
  const closing = (await kd(page, (K) => K.lastClosing()))!;
  expect(closing.counts).toEqual({ want: 4, seen: 1, pass: 5 });

  // Coherencia: si el cierre ya dijo "Hoy te inclinaste por…", Resumen no puede pedir "desliza unas cartas más".
  const c2 = (await kd(page, (K) => K.lastClosing() as unknown as { top_atoms: string[] }))!;
  const ins = await kd(page, (K) => K.insight());
  if (c2.top_atoms.length) expect(ins.ready).toBe(true);

  await open(page, 'Flujo2_Resumen');
  if (ins.ready) {
    await expect(page.getByText(ins.title, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(ins.empty_text)).toHaveCount(0);
  }
  await expect(page.locator('[data-k=count-want]')).toHaveText('4');
  await expect(page.locator('[data-k=count-seen]')).toHaveText('1');
  await expect(page.locator('[data-k=count-pass]')).toHaveText('5');
  await noAffinityNumbers(page, 'Resumen');
  await open(page, 'Flujo2b_Ticket');
  await expect(page.locator('[data-k=count-want]')).toHaveText('4');
  await expect(page.locator('[data-k=count-seen]')).toHaveText('1');
  await expect(page.locator('[data-k=count-pass]')).toHaveText('5');
  await noAffinityNumbers(page, 'Ticket');
});
