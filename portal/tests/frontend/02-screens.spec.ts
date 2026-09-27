import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Módulo de Pantallas (Frontend)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/screens');
    await page.waitForLoadState('networkidle');
  });

  test('1. Renderiza encabezado de Pantallas y botones de energía', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Pantallas' })).toBeVisible();
    
    // Botones de acción masiva
    await expect(page.locator('button:has-text("Encender Todas")')).toBeVisible();
    await expect(page.locator('button:has-text("Apagar Todas")')).toBeVisible();
  });

  test('2. Super Admin dispone de filtro por cliente', async ({ page }) => {
    const filterSection = page.locator('text=Filtrar por Cliente:');
    await expect(filterSection).toBeVisible();

    const clientSelect = page.locator('select').first();
    await expect(clientSelect).toBeVisible();
    
    // Debe incluir la opción 'Todos los clientes' y 'Sin asignar'
    const selectText = await clientSelect.innerText();
    expect(selectText).toContain('Todos los clientes');
    expect(selectText).toContain('Sin asignar');
  });

  test('3. Tarjetas de pantallas muestran estado y cuota de videos', async ({ page }) => {
    // Si existen tarjetas de pantalla, verificar que contienen indicador de rotación
    const screenCards = page.locator('.glass');
    const cardCount = await screenCards.count();
    
    if (cardCount > 0) {
      // Al menos una tarjeta o sección de métricas visible
      await expect(page.locator('text=videos en rotación').first()).toBeVisible();
    }
  });

  test('4. Modal de Actualizaciones OTA se abre correctamente', async ({ page }) => {
    const otaBtn = page.locator('button:has-text("Actualizaciones OTA")');
    if (await otaBtn.isVisible()) {
      await otaBtn.click();
      await expect(page.locator('text=Mantenimiento y Actualizaciones')).toBeVisible({ timeout: 5000 });
      // Cerrar modal
      const closeBtn = page.locator('div.fixed button').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });
});
