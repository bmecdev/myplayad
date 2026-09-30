import { test, expect } from '@playwright/test';
import { ADMIN_USER, ADMIN_PASSWORD, loginAsAdmin } from './helpers/auth';

test.describe('Módulo de Autenticación (Frontend)', () => {
  test('1. Renderiza formulario de inicio de sesión con branding', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('MyPlayAd');
    await expect(page.locator('text=Panel de Control & Cartelería Digital')).toBeVisible();

    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('Iniciar Sesión');
  });

  test('2. Muestra mensaje de error ante credenciales incorrectas', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="text"]').fill('usuario_falso');
    await page.locator('input[type="password"]').fill('clave_invalida');
    await page.locator('button[type="submit"]').click();

    // Debe aparecer la alerta con mensaje de error
    const errorAlert = page.locator('.text-destructive');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText(/inválidas|error/i);
  });

  test('3. Inicia sesión correctamente y navega al dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="text"]').fill(ADMIN_USER);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    // Verificar que estemos en el dashboard (ej. Sidebar con logo o menú)
    await expect(page.locator('text=MyPlayAd').first()).toBeVisible();
  });
});
