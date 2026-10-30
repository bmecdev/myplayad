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
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/videos/06-control-remoto-hdmi-ota.webm');

async function run() {
  console.log('--- Iniciando Grabación Video 6: Control Remoto HDMI-CEC y OTA ---');
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

  // 2. Navegar a Pantallas y Telemetría
  await setBanner(page, 'Centro de Control y Telemetría', 'Navegando a la administración de pantallas y comandos remotos...');
  const screensLink = page.locator('aside a[href="/screens"]').first();
  await humanClick(page, screensLink, { pauseAfter: 1200 });

  await setBanner(page, 'Centro de Control y Telemetría', 'Monitoreo de estado de pantallas y comandos remotos instantáneos.');
  await page.waitForTimeout(1000);

  // 3. Comando Apagar Todas (POWER_OFF)
  await setBanner(page, 'Comando Masivo HDMI-CEC: Apagar Todas', 'Envía orden MQTT a todos los televisores para entrar en modo reposo.');
  const turnOffBtn = page.locator('button:has-text("Apagar Todas")').first();
  await humanClick(page, turnOffBtn, { pauseAfter: 2000 });

  // 4. Comando Encender Todas (POWER_ON)
  await setBanner(page, 'Comando Masivo HDMI-CEC: Encender Todas', 'Reactiva los paneles de TV y reanuda la rotación de spots y juegos.');
  const turnOnBtn = page.locator('button:has-text("Encender Todas")').first();
  await humanClick(page, turnOnBtn, { pauseAfter: 2000 });

  // 5. Despacho de Actualizaciones Remotas OTA
  await setBanner(page, 'Módulo de Actualizaciones OTA (Over The Air)', 'Distribuye versiones de software y parches a las consolas Raspberry Pi.');
  const otaBtn = page.locator('button:has-text("Actualizaciones OTA")').first();
  await humanClick(page, otaBtn, { pauseAfter: 1200 });

  // 6. Explicar Modal de OTA
  await setBanner(page, 'Gestión Remota de Firmware y Juegos', 'Permite actualizar una pantalla específica o todo el parque sin visitas técnicas.');
  await page.waitForTimeout(2000);

  // 7. Cerrar Modal OTA
  const closeOtaBtn = page.locator('div.fixed button:has-text("Cancelar"), div.fixed button:has-text("Cerrar")').first();
  if (await closeOtaBtn.isVisible()) {
    await humanClick(page, closeOtaBtn, { pauseAfter: 1000 });
  } else {
    // Presionar Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  }

  // 8. Resumen
  await setBanner(page, '¡Mantenimiento 100% Remoto y Eficiente!', 'Control total de energía, software y salud de red desde cualquier lugar.');
  await page.waitForTimeout(2000);

  // Finalizar
  await finalizeVideo(page, context, OUTPUT_FILE);
  await browser.close();
  console.log('--- Video 6 finalizado con éxito ---');
}

run().catch((err) => {
  console.error('Error grabando Video 6:', err);
  process.exit(1);
});
