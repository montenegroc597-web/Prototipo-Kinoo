import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
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
