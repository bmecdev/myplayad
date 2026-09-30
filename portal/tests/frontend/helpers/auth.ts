import { Page, expect } from '@playwright/test';

export const ADMIN_USER = process.env.ADMIN_USER || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'myplayad123';

/**
 * Inicia sesión como Super Admin a través de la interfaz web
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  
  // Si ya estamos autenticados y redirige, salimos temprano
  if (page.url().includes('/screens') || (page.url().endsWith('/') && !page.url().includes('/login'))) {
    return;
  }

  const usernameInput = page.locator('input[type="text"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');

  await usernameInput.fill(ADMIN_USER);
  await passwordInput.fill(ADMIN_PASSWORD);
  await submitButton.click();

  // Esperar a que la navegación complete hacia el dashboard
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}
