import { test } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

const OUT_DIR = path.resolve(__dirname, '../../../docs/img');

test.describe('Captura de Pantallas para Manuales del Portal MyPlayAd', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(OUT_DIR)) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
    }
  });

  test('Capturar todas las pantallas del portal para el manual', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Pantalla de Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(OUT_DIR, '01-login.png'), fullPage: false });
    console.log('Capturado: 01-login.png');

    // Iniciar sesión como Super Admin
    await loginAsAdmin(page);

    // 2. Dashboard de Pantallas
    await page.goto('/screens');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '02-dashboard-screens.png'), fullPage: false });
    console.log('Capturado: 02-dashboard-screens.png');

    // 3. Filtro de Pantallas por Cliente
    const clientSelect = page.locator('select').first();
    if (await clientSelect.isVisible()) {
      await clientSelect.focus();
      await page.screenshot({ path: path.join(OUT_DIR, '03-screens-filter-client.png'), fullPage: false });
      console.log('Capturado: 03-screens-filter-client.png');
    }

    // 4. Modal de Actualizaciones OTA
    const otaBtn = page.locator('button:has-text("Actualizaciones OTA")');
    if (await otaBtn.isVisible()) {
      await otaBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT_DIR, '04-screens-ota-modal.png'), fullPage: false });
      console.log('Capturado: 04-screens-ota-modal.png');
      // Cerrar modal
      const closeBtn = page.locator('div.fixed button').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // 5. Biblioteca de Videos
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '05-videos-library.png'), fullPage: false });
    console.log('Capturado: 05-videos-library.png');

    // 6. Modal de Subida de Videos
    const uploadBtn = page.locator('button:has-text("Subir Video")');
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT_DIR, '06-videos-upload-modal.png'), fullPage: false });
      console.log('Capturado: 06-videos-upload-modal.png');
      const cancelBtn = page.locator('button:has-text("Cancelar")');
      if (await cancelBtn.isVisible()) await cancelBtn.click();
      await page.waitForTimeout(400);
    }

    // 7. Catálogo de Planes
    await page.goto('/plans');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '07-plans-catalog.png'), fullPage: false });
    console.log('Capturado: 07-plans-catalog.png');

    // 8. Modal de Nuevo Plan
    const newPlanBtn = page.locator('button:has-text("Nuevo Plan")');
    if (await newPlanBtn.isVisible()) {
      await newPlanBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT_DIR, '08-plans-new-modal.png'), fullPage: false });
      console.log('Capturado: 08-plans-new-modal.png');
      const cancelBtn = page.locator('button:has-text("Cancelar")');
      if (await cancelBtn.isVisible()) await cancelBtn.click();
      await page.waitForTimeout(400);
    }

    // 9. Gestión de Usuarios / Clientes
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '09-users-management.png'), fullPage: false });
    console.log('Capturado: 09-users-management.png');

    // 10. Catálogo de Minijuegos
    await page.goto('/games');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, '10-games-catalog.png'), fullPage: false });
    console.log('Capturado: 10-games-catalog.png');
  });
});

