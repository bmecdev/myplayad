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
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/videos/08-mantenimiento-y-bajas.webm');

async function run() {
  console.log('--- Iniciando Grabación Video 8: Mantenimiento, Desasignación y Bajas ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: {
      dir: '/tmp/playwright-demos',
      size: { width: 1366, height: 768 },
    },
  });

  const page = await context.newPage();
  await injectVisualHelpers(page);

  // Aceptar automáticamente cualquier diálogo confirm()
  page.on('dialog', async (dialog) => {
    console.log(`[Dialog] ${dialog.type()}: ${dialog.message()}`);
    await dialog.accept();
  });

  // 1. Acceso y Login
  await loginAsAdmin(page);

  // 2. Desasignar / Eliminar Videos de la Biblioteca
  await setBanner(page, 'Mantenimiento: Gestión de Videos Publicitarios', 'Navegando a la biblioteca para dar de baja contenidos...');
  const videosLink = page.locator('aside a[href="/videos"]').first();
  await humanClick(page, videosLink, { pauseAfter: 1200 });

  // Buscar el video recién creado (o el primero que coincida con Titán Plaza)
  const titanVideoTrash = page.locator('div.glass-card').filter({ hasText: /Titán|Primavera/i }).locator('button[title*="Eliminar"]').first();
  if (await titanVideoTrash.isVisible()) {
    await setBanner(page, 'Eliminación Definitiva de Spot Publicitario', 'Liberando espacio en disco y devolviendo slots a la cuota del cliente...');
    await humanClick(page, titanVideoTrash, { pauseAfter: 1500 });
  } else {
    // Si no está, buscar cualquier botón de eliminar video
    const anyVideoTrash = page.locator('button[title*="Eliminar Video"]').first();
    if (await anyVideoTrash.isVisible()) {
      await setBanner(page, 'Eliminación de Video Publicitario', 'Retirando video de la biblioteca...');
      await humanClick(page, anyVideoTrash, { pauseAfter: 1500 });
    }
  }

  // 3. Baja / Eliminación de Pantalla (Kiosco Físico)
  await setBanner(page, 'Baja de Pantalla / Kiosco Físico', 'Navegando a Pantallas para retirar un punto de la red...');
  const screensLink = page.locator('aside a[href="/screens"]').first();
  await humanClick(page, screensLink, { pauseAfter: 1200 });

  // Buscar la tarjeta de Titán Plaza
  const titanScreenCard = page.locator('div.glass-card').filter({ hasText: /Titán/i }).first();
  if (await titanScreenCard.isVisible()) {
    const trashBtn = titanScreenCard.locator('button[title*="Eliminar"]').first();
    if (await trashBtn.isVisible()) {
      await setBanner(page, 'Eliminando Pantalla del Sistema', 'Desvinculando el tótem físico y liberando la consola RPi...');
      await humanClick(page, trashBtn, { pauseAfter: 1500 });
    }
  }

  // 4. Baja de Cuenta de Cliente Comercial
  await setBanner(page, 'Baja de Cuenta de Cliente', 'Navegando a Usuarios para liquidar contrato comercial...');
  const usersLink = page.locator('aside a[href="/users"]').first();
  await humanClick(page, usersLink, { pauseAfter: 1200 });

  const titanUserRow = page.locator('tr, div.glass-card').filter({ hasText: /cliente_titan|Titán Plaza/i }).first();
  if (await titanUserRow.isVisible()) {
    const userTrashBtn = titanUserRow.locator('button[title*="Eliminar"], button:has(svg.lucide-trash-2)').first();
    if (await userTrashBtn.isVisible()) {
      await setBanner(page, 'Eliminando Usuario Comercial', 'Revocando credenciales y archivando histórico...');
      await humanClick(page, userTrashBtn, { pauseAfter: 1500 });
    }
  }

  // 5. Retiro de Plan de Suscripción del Catálogo
  await setBanner(page, 'Retiro de Plan Comercial', 'Navegando a Planes para descatalogar el paquete...');
  const plansLink = page.locator('aside a[href="/plans"]').first();
  await humanClick(page, plansLink, { pauseAfter: 1200 });

  const titanPlanCard = page.locator('div.glass-card').filter({ hasText: /Mall Platinum/i }).first();
  if (await titanPlanCard.isVisible()) {
    const planTrashBtn = titanPlanCard.locator('button[title*="Eliminar Plan"]').first();
    if (await planTrashBtn.isVisible()) {
      await setBanner(page, 'Eliminando Plan de Suscripción', 'Desactivando el plan del catálogo de ventas...');
      await humanClick(page, planTrashBtn, { pauseAfter: 1500 });
    }
  }

  // 6. Resumen y Finalización
  await setBanner(page, '¡Mantenimiento y Bajas Completado con Éxito!', 'El sistema permanece limpio, ordenado y con trazabilidad total.');
  await page.waitForTimeout(2000);

  // Finalizar
  await finalizeVideo(page, context, OUTPUT_FILE);
  await browser.close();
  console.log('--- Video 8 finalizado con éxito ---');
}

run().catch((err) => {
  console.error('Error grabando Video 8:', err);
  process.exit(1);
});

