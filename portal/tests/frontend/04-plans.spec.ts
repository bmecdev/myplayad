import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Módulo de Planes y Cuotas (Frontend)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/plans');
    await page.waitForLoadState('networkidle');
  });

  test('1. Renderiza lista de planes de suscripción y botón Nuevo Plan', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Planes de Suscripción' })).toBeVisible();
    await expect(page.locator('button:has-text("Nuevo Plan")')).toBeVisible();
  });

  test('2. Las tarjetas de planes muestran el badge de videos por pantalla', async ({ page }) => {
    // Al menos un plan con el badge de cuota de videos
    const quotaBadges = page.locator('text=/\\d+ videos por pantalla/');
    await expect(quotaBadges.first()).toBeVisible({ timeout: 5000 });
  });

  test('3. Modal de creación de plan incluye campo de límite de videos por pantalla', async ({ page }) => {
    const newPlanBtn = page.locator('button:has-text("Nuevo Plan")');
    await newPlanBtn.click();

    // Modal abierto
    await expect(page.locator('text=Nuevo Plan de Suscripción')).toBeVisible({ timeout: 5000 });

    // Campo de cuota de videos por pantalla
    const maxVideosLabel = page.locator('text=Máximo de Videos por Pantalla');
    await expect(maxVideosLabel).toBeVisible();

    // Input numérico
    const numberInput = page.locator('input[type="number"]');
    await expect(numberInput).toBeVisible();

    // Cerrar modal
    const cancelBtn = page.locator('button:has-text("Cancelar")');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    }
  });
});
