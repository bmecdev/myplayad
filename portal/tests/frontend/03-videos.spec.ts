import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Módulo de Videos (Frontend)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/videos');
    await page.waitForLoadState('networkidle');
  });

  test('1. Renderiza biblioteca de videos y botón de subida', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Videos Publicitarios|Mis Videos/i })).toBeVisible();
    await expect(page.locator('button:has-text("Subir Video")')).toBeVisible();
  });

  test('2. Super Admin dispone de filtro de videos por cliente', async ({ page }) => {
    const filterSection = page.locator('text=Filtrar Videos por Cliente:');
    await expect(filterSection).toBeVisible();

    const clientSelect = page.locator('select').first();
    await expect(clientSelect).toBeVisible();

    const selectText = await clientSelect.innerText();
    expect(selectText).toContain('Todos los clientes');
    expect(selectText).toContain('Sin cliente asignado');
  });

  test('3. Modal de subida de video muestra selector de cliente y cuotas de pantalla', async ({ page }) => {
    const uploadBtn = page.locator('button:has-text("Subir Video")');
    await uploadBtn.click();

    // El modal de subida debe abrirse
    await expect(page.locator('text=Subir Nuevo Video')).toBeVisible({ timeout: 5000 });

    // Selector de cliente destinatario para Super Admin
    await expect(page.locator('text=Cliente Propietario del Video')).toBeVisible();

    // Selector de pantalla a la que asignar el video
    await expect(page.locator('text=Asignar a Pantalla Inicialmente')).toBeVisible();

    // Cerrar modal
    const closeBtn = page.locator('button:has-text("Cancelar")');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });
});
