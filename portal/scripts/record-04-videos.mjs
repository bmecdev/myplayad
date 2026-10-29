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
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/videos/04-subida-videos-y-cuotas.webm');
const SAMPLE_VIDEO_PATH = path.resolve(__dirname, 'fixtures/sample-spot.mp4');

async function run() {
  console.log('--- Iniciando Grabación Video 4: Subida de Videos y Cuotas ---');
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

  // 1. Acceso y Login
  await loginAsAdmin(page);

  // 2. Navegar a Videos
  await setBanner(page, 'Biblioteca de Videos Publicitarios', 'Gestión de contenidos comerciales y cuotas de rotación...');
  const videosLink = page.locator('aside a[href="/videos"]').first();
  await humanClick(page, videosLink, { pauseAfter: 1200 });

  // 3. Abrir Modal de Subida
  await setBanner(page, 'Cargar Nuevo Spot Comercial', 'Subiendo material publicitario en video de alta calidad...');
  const uploadBtn = page.locator('button:has-text("Subir Video")').first();
  await humanClick(page, uploadBtn, { pauseAfter: 800 });

  // 4. Completar Título
  await setBanner(page, 'Título de la Campaña Publicitaria', 'Asignando nombre al anuncio para seguimiento en reportes.');
  const titleInput = page.locator('input[placeholder*="Promo Verano"]').first();
  await humanType(page, titleInput, 'Campaña Primavera Titán Plaza', 35);

  // 5. Seleccionar Cliente Propietario
  await setBanner(page, 'Asignar al Cliente Titán Plaza', 'Vinculando el spot a la cuenta de la marca...');
  const clientSelect = page.locator('select').first();
  if (await clientSelect.isVisible()) {
    // Buscar opción de Titán Plaza
    const options = await clientSelect.locator('option').allInnerTexts();
    const matchIndex = options.findIndex(o => o.toLowerCase().includes('titán') || o.toLowerCase().includes('titan'));
    if (matchIndex >= 0) {
      await clientSelect.selectOption({ index: matchIndex });
    } else if (options.length > 1) {
      await clientSelect.selectOption({ index: 1 });
    }
    await page.waitForTimeout(600);
  }

  // 6. Seleccionar Pantalla y Mostrar Cuota
  await setBanner(page, 'Cuota de Rotación por Pantalla', 'Validación del límite del plan: spots usados vs. spots contratados.');
  const screenSelect = page.locator('select').nth(1);
  if (await screenSelect.isVisible()) {
    const screenOptions = await screenSelect.locator('option').allInnerTexts();
    const titanIndex = screenOptions.findIndex(o => o.toLowerCase().includes('titán') || o.toLowerCase().includes('titan'));
    if (titanIndex >= 0) {
      await screenSelect.selectOption({ index: titanIndex });
    } else if (screenOptions.length > 1) {
      await screenSelect.selectOption({ index: 1 });
    }
    await page.waitForTimeout(800);
  }

  // 7. Cargar Archivo MP4
  await setBanner(page, 'Seleccionando Archivo de Video MP4', 'Adjuntando spot publicitario optimizado...');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(SAMPLE_VIDEO_PATH);
  await page.waitForTimeout(800);

  // 8. Enviar Subida
  await setBanner(page, 'Subiendo Spot Publicitario', 'Enviando video y programando rotación en el kiosco...');
  const submitBtn = page.locator('div.glass button[type="submit"]:has-text("Subir Video")').first();
  await humanClick(page, submitBtn, { pauseAfter: 2500 });

  // 9. Resaltar Video en la Biblioteca
  await setBanner(page, '¡Spot Asignado e Incorporado a la Rotación!', 'El reproductor descargará el video y comenzará su emisión automática.');
  await page.waitForTimeout(2500);

  // Finalizar
  await finalizeVideo(page, context, OUTPUT_FILE);
  await browser.close();
  console.log('--- Video 4 finalizado con éxito ---');
}

run().catch((err) => {
  console.error('Error grabando Video 4:', err);
  process.exit(1);
});

