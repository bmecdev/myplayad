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
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/videos/02-alta-pantalla-kiosco.webm');

async function run() {
  console.log('--- Iniciando Grabación Video 2: Alta de Pantalla Kiosco ---');
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

  // 2. Navegar a Pantallas
  await setBanner(page, 'Módulo de Pantallas', 'Navegando a la administración de tótems y kioscos...');
  const screensLink = page.locator('aside a[href="/screens"]').first();
  await humanClick(page, screensLink, { pauseAfter: 1200 });

  // 3. Dashboard de Pantallas
  await setBanner(page, 'Dashboard de Pantallas', 'Monitoreo de tótems, estado de conexión y comandos remotos.');
  await page.waitForTimeout(1000);

  // 4. Abrir Modal Nueva Pantalla
  await setBanner(page, 'Registrar Nueva Pantalla', 'Dando de alta un nuevo punto físico en la red MyPlayAd...');
  const newScreenBtn = page.locator('button:has-text("Nueva Pantalla")').first();
  await humanClick(page, newScreenBtn, { pauseAfter: 800 });

  // 5. Completar Nombre y Ubicación
  await setBanner(page, 'Datos del Kiosco / Tótem', 'Ingresando nombre descriptivo y ubicación en el centro comercial.');
  const nameInput = page.locator('input[placeholder*="Ej: Pantalla Principal"]').first();
  await humanType(page, nameInput, 'Tótem Titán Plaza - Plaza Central', 40);

  const locInput = page.locator('input[placeholder*="Ej: Entrada Sur"]').first();
  await humanType(page, locInput, 'Plaza Central - Frente a Tiendas Ancla', 40);

  const descInput = page.locator('textarea[placeholder*="Detalles adicionales"]').first();
  if (await descInput.isVisible()) {
    await humanType(page, descInput, 'Tótem vertical 4K con Raspberry Pi 5 y control interactivo móvil.', 25);
  }

  // 6. Vincular Consola Hardware RPi
  await setBanner(page, 'Vincular Hardware Raspberry Pi', 'Asociando el identificador del dispositivo físico (Console ID).');
  const consoleInput = page.locator('input[placeholder*="Ej: consola1"]').first();
  if (await consoleInput.isVisible()) {
    await humanType(page, consoleInput, 'rpi5-titan-01', 50);
  }

  // 7. Configurar Horarios Automáticos HDMI-CEC
  await setBanner(page, 'Programación de Energía HDMI-CEC', 'Configurando encendido a las 08:00 y apagado a las 22:00.');
  const powerOn = page.locator('input[type="time"]').first();
  if (await powerOn.isVisible()) {
    await humanType(page, powerOn, '08:00', 30);
  }

  // 8. Guardar Pantalla
  await setBanner(page, 'Guardando Pantalla en el Sistema', 'Registrando en la base de datos de MyPlayAd...');
  const submitBtn = page.locator('form button[type="submit"]:has-text("Guardar")').first();
  await humanClick(page, submitBtn, { pauseAfter: 1500 });

  // Esperar a que el modal se cierre
  await page.locator('div.fixed:has-text("Registrar Pantalla")').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // 9. Resaltar la nueva pantalla y copiar su SCREEN_ID
  await setBanner(page, 'Pantalla Registrada con Éxito', 'Identificador SCREEN_ID generado para la configuración del quiosco.');
  const titanCard = page.locator('div.glass-card').filter({ hasText: /Titán/i }).first();
  if (await titanCard.isVisible()) {
    const copyBtn = titanCard.locator('button[title*="Copiar ID"]').first();
    if (await copyBtn.isVisible()) {
      await humanClick(page, copyBtn, { pauseAfter: 1200 });
    }
  }

  await setBanner(page, '¡Lista para Asignación y Reproducción!', 'El hardware se encuentra conectado y listo para recibir clientes y pauta.');
  await page.waitForTimeout(2000);

  // Finalizar
  await finalizeVideo(page, context, OUTPUT_FILE);
  await browser.close();
  console.log('--- Video 2 finalizado con éxito ---');
}

run().catch((err) => {
  console.error('Error grabando Video 2:', err);
  process.exit(1);
});
