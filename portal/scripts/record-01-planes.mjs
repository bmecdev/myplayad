import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BASE_URL,
  injectVisualHelpers,
  setBanner,
  humanClick,
  humanType,
  smoothMoveTo,
  loginAsAdmin,
  finalizeVideo,
} from './demo-recorder-helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/videos/01-creacion-planes-comerciales.webm');

async function run() {
  console.log('--- Iniciando Grabación Video 1: Creación de Planes Comerciales ---');
  const browser = await chromium.launch({
    headless: true,
  });

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

  // 2. Navegar a Planes
  await setBanner(page, 'Módulo de Planes de Suscripción', 'Navegando al catálogo de planes comerciales...');
  const planesLink = page.locator('aside a[href="/plans"]').first();
  await humanClick(page, planesLink, { pauseAfter: 1200 });

  // 3. Explicar los planes existentes
  await setBanner(page, 'Catálogo de Planes Activos', 'Visualización de los planes actuales y límites de rotación.');
  await page.waitForTimeout(1500);

  // 4. Abrir Modal Nuevo Plan
  await setBanner(page, 'Crear Nuevo Plan Comercial', 'Configuración de paquete para clientes premium...');
  const newPlanBtn = page.locator('button:has-text("Nuevo Plan")');
  await humanClick(page, newPlanBtn, { pauseAfter: 800 });

  // 5. Completar Formulario
  await setBanner(page, 'Definir Nombre y Slug del Plan', 'Ingresando detalles comerciales del nuevo plan.');
  const nameInput = page.locator('input[placeholder*="Ej: Plan Arcade"]').first();
  await humanType(page, nameInput, 'Plan Mall Platinum Arcade', 40);

  const slugInput = page.locator('input[placeholder*="ej: arcade-oro"]').first();
  await humanType(page, slugInput, 'mall-platinum', 40);

  // 6. Configurar Límite de Videos por Pantalla
  await setBanner(page, 'Cuota de Rotación Publicitaria', 'Fijando límite de 5 videos en rotación simultánea.');
  const maxVideosInput = page.locator('input[type="number"]').first();
  await humanType(page, maxVideosInput, '5', 60);

  // 7. Descripción
  await setBanner(page, 'Descripción del Servicio', 'Detallando beneficios y alcance para centros comerciales.');
  const descInput = page.locator('textarea').first();
  if (await descInput.isVisible()) {
    await humanType(page, descInput, 'Paquete comercial con 5 spots publicitarios y acceso al catálogo completo de minijuegos retro.', 30);
  }

  // 8. Seleccionar Juegos Arcade
  await setBanner(page, 'Selección de Minijuegos Incluidos', 'Habilitando juegos interactivos para los tótems del cliente.');
  const selectAllBtn = page.locator('button:has-text("Seleccionar Todos")');
  if (await selectAllBtn.isVisible()) {
    await humanClick(page, selectAllBtn, { pauseAfter: 1000 });
  }

  // 9. Guardar Plan
  await setBanner(page, 'Guardando Plan Comercial', 'Registrando el plan en la plataforma MyPlayAd.');
  const submitBtn = page.locator('button[type="submit"]:has-text("Crear Plan"), button[type="submit"]:has-text("Guardar")').first();
  await humanClick(page, submitBtn, { pauseAfter: 1500 });

  // 10. Resaltar el nuevo plan en la grilla
  await setBanner(page, '¡Plan Creado Exitosamente!', 'Listo para ser asignado a clientes y contratos comerciales.');
  await page.waitForTimeout(2000);

  // Finalizar
  await finalizeVideo(page, context, OUTPUT_FILE);
  await browser.close();
  console.log('--- Video 1 finalizado con éxito ---');
}

run().catch((err) => {
  console.error('Error grabando Video 1:', err);
  process.exit(1);
});

