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
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/videos/03-alta-cliente-y-asignacion.webm');

async function run() {
  console.log('--- Iniciando Grabación Video 3: Alta de Cliente y Asignación de Recursos ---');
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

  // 2. Navegar a Usuarios / Clientes
  await setBanner(page, 'Módulo de Gestión de Clientes', 'Navegando a la administración de usuarios comerciales...');
  const usersLink = page.locator('aside a[href="/users"]').first();
  await humanClick(page, usersLink, { pauseAfter: 1200 });

  // 3. Abrir Modal Nuevo Cliente
  await setBanner(page, 'Registrar Nuevo Cliente Comercial', 'Creando credenciales de acceso y contrato...');
  const newClientBtn = page.locator('button:has-text("Nuevo Cliente")').first();
  await humanClick(page, newClientBtn, { pauseAfter: 800 });

  // 4. Datos del Cliente
  await setBanner(page, 'Datos de la Empresa y Acceso', 'Ingresando nombre comercial, usuario y contraseña...');
  const nameInput = page.locator('input[placeholder*="Mall Plaza Sur"]').first();
  await humanType(page, nameInput, 'Titán Plaza Centro Comercial', 35);

  const usernameInput = page.locator('input[placeholder*="cliente_mall"]').first();
  await humanType(page, usernameInput, 'cliente_titan', 40);

  const passInput = page.locator('input[placeholder*="Contraseña segura"]').first();
  await humanType(page, passInput, 'titan123', 40);

  const emailInput = page.locator('input[placeholder*="contacto@cliente.com"]').first();
  if (await emailInput.isVisible()) {
    await humanType(page, emailInput, 'comercial@titanplaza.com', 35);
  }

  // 5. Asignar el Plan Creado en el Video 1
  await setBanner(page, 'Asignación de Plan de Suscripción', 'Vinculando el Plan Mall Platinum con cuota de 5 videos...');
  const planSelect = page.locator('select').nth(1); // Segundo select es el Plan
  if (await planSelect.isVisible()) {
    await planSelect.selectOption({ label: 'Plan Mall Platinum Arcade' }).catch(async () => {
      // Fallback por texto
      const options = await planSelect.locator('option').allTextContents();
      const match = options.find(o => o.includes('Platinum') || o.includes('Arcade Pro') || o.includes('VIP'));
      if (match) await planSelect.selectOption({ label: match });
    });
    await page.waitForTimeout(600);
  }

  // 6. Atajo de Duración de Contrato (+1 Año)
  await setBanner(page, 'Vigencia de la Suscripción', 'Fijando contrato anual mediante el atajo "+1 Año"...');
  const addYearBtn = page.locator('button:has-text("+1 Año")').first();
  if (await addYearBtn.isVisible()) {
    await humanClick(page, addYearBtn, { pauseAfter: 800 });
  }

  // 7. Asignar Pantalla al Cliente
  await setBanner(page, 'Vinculación de Pantallas', 'Asignando el Tótem Titán Plaza a la cuenta del cliente...');
  const screenCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: '' }).first();
  // Buscar checkbox del tótem o primer checkbox en la lista
  const titanScreenLabel = page.locator('label:has-text("Titán")').first();
  if (await titanScreenLabel.isVisible()) {
    await humanClick(page, titanScreenLabel, { pauseAfter: 600 });
  } else {
    // Buscar cualquier checkbox de pantalla dentro del modal
    const modalCheckboxes = page.locator('div.glass input[type="checkbox"]');
    const count = await modalCheckboxes.count();
    if (count > 0) {
      await humanClick(page, modalCheckboxes.first(), { pauseAfter: 600 });
    }
  }

  // 8. Guardar Cliente
  await setBanner(page, 'Guardando Cuenta de Cliente', 'Registrando cliente con plan y pantalla asignada...');
  const submitBtn = page.locator('div.glass button[type="submit"]:has-text("Guardar"), div.glass button[type="submit"]:has-text("Crear")').first();
  await humanClick(page, submitBtn, { pauseAfter: 1500 });

  // 9. Resaltar en la lista
  await setBanner(page, '¡Cliente Activado y Conectado!', 'Listo para que el cliente acceda a su portal y gestione sus anuncios.');
  await page.waitForTimeout(2000);

  // Finalizar
  await finalizeVideo(page, context, OUTPUT_FILE);
  await browser.close();
  console.log('--- Video 3 finalizado con éxito ---');
}

run().catch((err) => {
  console.error('Error grabando Video 3:', err);
  process.exit(1);
});

