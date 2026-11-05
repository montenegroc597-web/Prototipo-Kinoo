import { expect, test } from '@playwright/test';

// Línea base del prototipo: las pantallas publicadas cargan en las mismas rutas.
test('la raíz redirige a Descubrir y las pantallas de Ver y Descubrir cargan', async ({ page }) => {
  await page.goto('./');
  await page.waitForURL(/kinoo-flujo\/Flujo1_Descubrir\.dc\.html/);
  for (const p of ['kinoo-flujo/Flujo1_Descubrir.dc.html', 'kinoo-flujo/FlujoV1_Feed.dc.html', 'kinoo-flujo/Flujo2_Resumen.dc.html']) {
    const r = await page.goto(p);
    expect(r?.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
  }
});
