import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BASE_URL,
  injectVisualHelpers,
  setBanner,
  humanClick,
  humanType,
  loginAsAdmin,
  finalizeVideo,
} from './demo-recorder-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/videos/05-programacion-juegos-arcade.webm');

async function run() {
  console.log('--- Iniciando Grabación Video 5: Asignación y Programación de Juegos Arcade ---');
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

  // 2. Navegar al Dashboard de Pantallas
  await setBanner(page, 'Selección de Tótem para Configuración Arcade', 'Ingresando a los detalles técnicos de la pantalla...');
  const screensLink = page.locator('aside a[href="/screens"]').first();
  await humanClick(page, screensLink, { pauseAfter: 1200 });

  // 3. Hacer clic en Administrar pantalla
  const screenCardLink = page.locator('a[title="Administrar"], a[href^="/screens/"]').first();
  await humanClick(page, screenCardLink, { pauseAfter: 1500 });
  await page.waitForLoadState('networkidle');

  // 4. Explicar Sección de Juego Retro
  await setBanner(page, 'Detalle de la Pantalla: Minijuegos Interactivos', 'El kiosco intercala videos publicitarios con partidas de juegos retro.');
  await page.waitForTimeout(1500);

  // 5. Clic en "Asignar Juego" (Juego por Defecto)
  await setBanner(page, 'Asignar Juego Principal (Default)', 'Cambiando el minijuego base del kiosco...');
  const assignGameBtn = page.locator('button:has-text("Asignar Juego"), button:has-text("Cambiar Juego")').first();
  await humanClick(page, assignGameBtn, { pauseAfter: 800 });

  // 6. Seleccionar Arkanoid o Invaders
  await setBanner(page, 'Seleccionar Título Arcade', 'Elige entre los juegos autorizados por el plan contratado.');
  const gameSelect = page.locator('div.fixed select').first();
  if (await gameSelect.isVisible()) {
    const options = await gameSelect.locator('option').allInnerTexts();
    const matchIndex = options.findIndex(o => o.toLowerCase().includes('arkanoid') || o.toLowerCase().includes('invaders') || o.toLowerCase().includes('snake'));
    if (matchIndex >= 0) {
      await gameSelect.selectOption({ index: matchIndex });
    }
    await page.waitForTimeout(600);
  }

  // 7. Confirmar Asignación
  await setBanner(page, 'Confirmando Asignación Arcade', 'El kiosco actualizará su cartelera interactiva de inmediato.');
  const confirmBtn = page.locator('div.fixed button[type="submit"]:has-text("Asignar"), div.fixed button[type="submit"]:has-text("Guardar")').first();
  await humanClick(page, confirmBtn, { pauseAfter: 1500 });

  // 8. Programar Torneo / Evento Especial por Fecha
  await setBanner(page, 'Programar Evento / Torneo Arcade', 'Agendando un juego especial para fechas o promociones puntuales...');
  const scheduleBtn = page.locator('button:has-text("Programar"), button:has-text("Programar Juego")').first();
  if (await scheduleBtn.isVisible()) {
    await humanClick(page, scheduleBtn, { pauseAfter: 800 });

    const schedSelect = page.locator('div.fixed select').first();
    if (await schedSelect.isVisible()) {
      const opts = await schedSelect.locator('option').allInnerTexts();
      if (opts.length > 1) {
        await schedSelect.selectOption({ index: 1 });
      }
    }

    await setBanner(page, 'Calendario de Rotación Inteligente', 'Durante la fecha del torneo, este juego tendrá prioridad absoluta.');
    await page.waitForTimeout(1000);

    const schedSubmit = page.locator('div.fixed button[type="submit"]').first();
    if (await schedSubmit.isVisible()) {
      await humanClick(page, schedSubmit, { pauseAfter: 1500 });
    }
  }

  // 9. Resumen y Finalización
  await setBanner(page, '¡Programación Arcade Guardada!', 'El reproductor cambiará de juego automáticamente según el calendario.');
  await page.waitForTimeout(2000);

  // Finalizar
  await finalizeVideo(page, context, OUTPUT_FILE);
  await browser.close();
  console.log('--- Video 5 finalizado con éxito ---');
}

run().catch((err) => {
  console.error('Error grabando Video 5:', err);
  process.exit(1);
});
