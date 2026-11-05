import { expect, test } from '@playwright/test';
import { CAMILO_ID, loginAsCamilo } from './helpers';

test('clave equivocada: avisa y no entra', async ({ page }) => {
  await page.goto('entrar.html');
  await page.getByLabel('Usuario').fill('camilo');
  await page.getByLabel('Clave').fill('0000');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('Usuario o clave incorrectos.')).toBeVisible();
  await expect(page).toHaveURL(/entrar\.html/);
});

test('sin sesión, una pantalla conectada pide entrar y después vuelve a ella', async ({ page }) => {
  await page.goto('kinoo-flujo/FlujoV1_Feed.dc.html');
  await page.waitForURL(/entrar\.html\?next=/);
  await page.getByLabel('Usuario').fill('Camilo');
  await page.getByLabel('Clave').fill('1234');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/FlujoV1_Feed\.dc\.html/);
});

test('con sesión: el historial se guarda por cuenta y se puede salir', async ({ page }) => {
  await loginAsCamilo(page);
  const s = await page.evaluate(() => (window as unknown as { KinooDemo: { session(): { name: string; user_id: string } } }).KinooDemo.session());
  expect(s).toMatchObject({ name: 'Camilo', user_id: CAMILO_ID });
  await expect.poll(() => page.evaluate((id) => localStorage.getItem(`kinoo.demo.v2:${id}`) !== null, CAMILO_ID)).toBe(true);
  await page.goto('entrar.html');
  await expect(page.getByText('Hola,')).toBeVisible();
  await page.getByRole('button', { name: 'Salir y cambiar de usuario' }).click();
  await expect(page.getByLabel('Usuario')).toBeVisible();
  await page.goto('kinoo-flujo/Flujo1_Descubrir.dc.html');
  await page.waitForURL(/entrar\.html/);
});
