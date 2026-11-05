import { expect, test } from '@playwright/test';
import { loginAsCamilo } from './helpers';

// Las pantallas publicadas siguen en las mismas rutas. La raíz lleva al inicio de sesión de la demo.
test('la raíz lleva a entrar y, con sesión, las pantallas de Ver y Descubrir cargan', async ({ page }) => {
  await page.goto('./');
  await page.waitForURL(/entrar\.html/);
  await loginAsCamilo(page);
  for (const p of ['kinoo-flujo/Flujo1_Descubrir.dc.html', 'kinoo-flujo/FlujoV1_Feed.dc.html', 'kinoo-flujo/Flujo2_Resumen.dc.html']) {
    const r = await page.goto(p);
    expect(r?.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
  }
});
