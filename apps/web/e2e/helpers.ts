import { type Page, expect } from '@playwright/test';

export const CAMILO_ID = '0c4a1100-0000-4000-8000-000000000001';

/** Mini inicio de sesión de la demo: camilo / 1234. */
export async function loginAsCamilo(page: Page) {
  await page.goto('entrar.html');
  await page.getByLabel('Usuario').fill('camilo');
  await page.getByLabel('Clave').fill('1234');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/kinoo-flujo\/Flujo1_Descubrir\.dc\.html/);
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { KinooDemo?: unknown }).KinooDemo)).toBe(true);
}
