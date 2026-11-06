import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BASE_URL,
  injectVisualHelpers,
  setBanner,
  humanClick,
  loginAsAdmin,
  finalizeVideo,
} from './demo-recorder-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/videos/09-kiosco-virtual-pc-smart-tv.webm');

async function run() {
  console.log('--- Iniciando Grabación Video 9: Kiosco Virtual para PC y Smart TV ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: '/tmp/playwright-demos',
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();
  await injectVisualHelpers(page);

  // 1. Acceso y Login
  await loginAsAdmin(page);

  // 2. Navegar al Kiosco Virtual desde el menú lateral
  await setBanner(page, 'Acceso al Kiosco Virtual', 'Navegando a la consola interactiva en navegador...');
  const kioskLink = page.locator('aside a[href="/demo"]').first();
  await humanClick(page, kioskLink, { pauseAfter: 2000 });
  await page.waitForLoadState('networkidle');

  // 3. Explicación de la Consola Dual en Modo Horizontal (16:9)
  await setBanner(page, 'Kiosco Virtual: Pantalla Dual 16:9', 'Lado izquierdo: Minijuego arcade interactivo. Lado derecho: Video publicitario.');
  await page.waitForTimeout(2500);

  // 4. Conmutar a Modo Vertical (9:16 Tótem)
  await setBanner(page, 'Orientación Vertical (9:16 Tótem)', 'Adaptable con un clic para tótems de centros comerciales.');
  const portraitBtn = page.locator('button:has-text("Vertical")').first();
  if (await portraitBtn.isVisible()) {
    await humanClick(page, portraitBtn, { pauseAfter: 2500 });
  }

  // 5. Volver a Modo Horizontal
  await setBanner(page, 'Orientación Horizontal (16:9 TV)', 'Volviendo a pantalla completa para monitores y televisores.');
  const landscapeBtn = page.locator('button:has-text("Horizontal")').first();
  if (await landscapeBtn.isVisible()) {
    await humanClick(page, landscapeBtn, { pauseAfter: 1500 });
  }

  // 6. Selector de Pantallas Asociadas y Segmentación
  await setBanner(page, 'Segmentación por Plan y Pantalla', 'Carga automática de videos y minijuegos autorizados para cada cliente.');
  const screenSelect = page.locator('select').first();
  if (await screenSelect.isVisible()) {
    await humanClick(page, screenSelect, { pauseAfter: 1200 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // 7. Publicidad Pre-Juego y Modo Pantalla Completa
  await setBanner(page, 'Operación 100% en Navegador', '¡Listo para operar en cualquier PC o Smart TV sin hardware Raspberry Pi!');
  await page.waitForTimeout(2500);

  // Finalizar
  await finalizeVideo(page, context, OUTPUT_FILE);
  await browser.close();
  console.log('--- Video 9 finalizado con éxito ---');
}

run().catch((err) => {
  console.error('Error grabando Video 9:', err);
  process.exit(1);
});

