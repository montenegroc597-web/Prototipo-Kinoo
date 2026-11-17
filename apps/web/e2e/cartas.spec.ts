import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { auditTexts } from './auditoria-textos';
import { loginAsCamilo } from './helpers';

// Estándar de caracteres de la carta: ningún texto de ninguna película del catálogo puede salirse del borde
// (frente ni reverso). Usa el modo ?auditoria= de la demo, que muestra las películas pedidas sin guardar nada.
const pilot = JSON.parse(readFileSync(path.resolve(process.cwd(), '../../packages/catalog/data/movies.pilot.json'), 'utf8')) as {
  movies: Array<{ id: string }>;
};
const ids = pilot.movies.map((m) => m.id);

test('ningún texto de la carta se sale del borde, en las 69 películas', async ({ page }) => {
  test.setTimeout(240_000);
  await loginAsCamilo(page);
  const problems: string[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    await page.goto(`kinoo-flujo/Flujo1_Descubrir.dc.html?auditoria=${chunk.join(',')}`);
    await page.evaluate(() => document.fonts.ready);
    for (let c = 0; c < chunk.length; c++) {
      await page.waitForTimeout(500);
      const found = await page.evaluate(() => {
        // Las dos caras de la carta: 350 × 564 con borde crema. Frente = vino; reverso = casi negro.
        const faces = [...document.querySelectorAll<HTMLElement>('div')].filter((d) => {
          const r = d.getBoundingClientRect();
          return (
            Math.round(r.width) === 350 &&
            Math.round(r.height) === 564 &&
            d.style.border.includes('solid') &&
            d.style.transform !== 'translateY(10px) scale(0.96)'
          );
        });
        const out: string[] = [];
        for (const face of faces.slice(-2)) {
          const name = getComputedStyle(face).backgroundColor === 'rgb(26, 20, 17)' ? 'reverso' : 'frente';
          const fr = face.getBoundingClientRect();
          for (const el of face.querySelectorAll<HTMLElement>('p')) {
            const text = el.innerText.trim();
            const r = el.getBoundingClientRect();
            if (!text || r.width === 0) continue;
            const over = Math.max(r.right - (fr.right - 4), r.bottom - (fr.bottom - 4));
            if (over > 0.5) out.push(`${name} · +${Math.round(over)} px · ${text.slice(0, 60)}`);
          }
        }
        return out;
      });
      for (const f of found) problems.push(`${chunk[c]} · ${f}`);
      await page.getByRole('button', { name: 'No me interesa' }).click();
    }
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

test('ficha ADN: ningún texto se sale ni se monta, en las 69 películas', async ({ page }) => {
  test.setTimeout(420_000);
  await loginAsCamilo(page);
  const problems: string[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    await page.goto(`kinoo-flujo/Flujo1_Descubrir.dc.html?auditoria=${chunk.join(',')}`);
    await page.evaluate(() => document.fonts.ready);
    for (let c = 0; c < chunk.length; c++) {
      await page.waitForTimeout(500);
      const card = (await page.locator('[style*="cursor: grab"]').first().boundingBox())!;
      await page.mouse.click(card.x + card.width / 2, card.y + 40);
      await page.waitForTimeout(1200);
      await page.getByText('ADN', { exact: true }).first().click();
      await page.waitForTimeout(600);
      for (const f of await page.evaluate(auditTexts, 'el ADN de esta película')) problems.push(`${chunk[c]} · ${f}`);
      await page.mouse.click(200, 60);
      await page.waitForTimeout(450);
      await page.getByRole('button', { name: 'No me interesa' }).click();
    }
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

test('Ver: con las 69 películas en la cartelera, ningún texto se sale ni se monta', async ({ page }) => {
  test.setTimeout(300_000);
  await loginAsCamilo(page);
  const problems: string[] = [];
  const seen = new Set<string>();
  // La cartelera muestra hasta billboard_max_films (10): se guardan de a 10 para que pasen las 69 por la carta.
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    await page.evaluate(async (some) => {
      const K = (window as unknown as { KinooDemo: { reset(): void; adapter: { postEvents(e: unknown[]): Promise<unknown> } } }).KinooDemo;
      K.reset();
      localStorage.removeItem('kinoo.ver.mood');
      await K.adapter.postEvents(some.map((id) => ({ type: 'saved_intent', movie_id: id, payload: { flipped: false } })));
    }, chunk);
    await page.goto('kinoo-flujo/FlujoV1_Feed.dc.html');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[data-k=mood-name]')).toHaveText(/todas/i);
    const n = await page.evaluate(
      () => (window as unknown as { KinooDemo: { billboard(k: string): { films: unknown[] } } }).KinooDemo.billboard('todas').films.length,
    );
    expect(n).toBe(chunk.length);
    await page.waitForTimeout(900);
    for (let k = 0; k < n; k++) {
      seen.add((await page.locator('[data-k=title]').innerText()).trim());
      for (const f of await page.evaluate(auditTexts, null)) problems.push(`lote ${i / 10 + 1}, carta ${k + 1} · ${f}`);
      if (n > 1) {
        await page.locator('[data-k=next]').click();
        // La carta nueva entra con una animación: se mide cuando ya se detuvo.
        await page.waitForTimeout(800);
      }
    }
    // La parte de abajo (repisa vacía y lo que aprendimos de ti) se mide con el scroll abajo.
    if (i === 0) {
      await page.locator('.kscroll').evaluate((e) => e.scrollTo(0, e.scrollHeight));
      await page.waitForTimeout(400);
      for (const f of await page.evaluate(auditTexts, null)) problems.push(`abajo · ${f}`);
    }
  }
  // Pasaron las 69 por la carta (títulos distintos; dos películas podrían recortarse igual, por eso ≥ 65).
  expect(seen.size).toBeGreaterThanOrEqual(65);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('pantallas fijas: ningún texto se sale de su caja', async ({ page }) => {
  await loginAsCamilo(page);
  const pages = [
    'Flujo2_Resumen',
    'Flujo2b_Ticket',
    'Flujo2c_Perfil',
    'Flujo3_Minijuego',
    'Flujo4_Eleccion',
    'Flujo5_Inicio',
    'FlujoV2_Abriendo',
    'FlujoV3_Funcion',
    'FlujoV4_Calificar',
    'FlujoV5_Version',
    'FlujoV6_Gracias',
  ];
  const problems: string[] = [];
  for (const p of pages) {
    await page.goto(`kinoo-flujo/${p}.dc.html`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    for (const f of await page.evaluate(auditTexts, null)) if (f.startsWith('se sale')) problems.push(`${p} · ${f}`);
  }
  expect(problems, problems.join('\n')).toEqual([]);
});
