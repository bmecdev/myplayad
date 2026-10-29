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
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/videos/07-roles-admin-vs-cliente.webm');

async function run() {
  console.log('--- Iniciando Grabación Video 7: Roles Super Admin vs Cliente ---');
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

  // 1. Acceso como Super Admin
  await loginAsAdmin(page);

  // 2. Demostración de Privilegios Globales
  await setBanner(page, 'Vista: Super Administrador (Control Total)', 'Visualiza todas las pantallas de la red, todos los clientes y menús avanzados.');
  await page.waitForTimeout(2000);

  // 3. Mostrar Filtro Global de Clientes
  const filterSelect = page.locator('select').first();
  if (await filterSelect.isVisible()) {
    await setBanner(page, 'Filtro Global por Cliente Comercial', 'El Super Admin puede auditar pantallas de cualquier cliente o del pool libre.');
    await humanClick(page, filterSelect, { pauseAfter: 800 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 4. Mostrar Sidebar Completo
  await setBanner(page, 'Menús Globales: Planes, Usuarios, Telemetría', 'Gestión integral del modelo de negocio y contratos.');
  await page.waitForTimeout(1500);

  // 5. Cerrar Sesión
  await setBanner(page, 'Cerrando Sesión de Administrador...', 'Cambiando a la experiencia del cliente final.');
  const logoutBtn = page.locator('button:has-text("Cerrar Sesión")').first();
  await humanClick(page, logoutBtn, { pauseAfter: 1500 });
  await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // 6. Login como Cliente Comercial
  await setBanner(page, 'Ingreso como Cliente Comercial', 'Autenticación con la cuenta de Titán Plaza...');
  const userInput = page.locator('input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await humanType(page, userInput, 'cliente_titan', 40);
  await humanType(page, passInput, 'titan123', 40);
  await humanClick(page, submitBtn, { pauseAfter: 1500 });

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 12000 });
  await page.waitForLoadState('networkidle');

  // 7. Demostración de Entorno Aislado del Cliente
  await setBanner(page, 'Vista: Cliente Comercial (Entorno Aislado)', 'Solo visualiza sus propias pantallas contratadas ("Mis Pantallas").');
  await page.waitForTimeout(2000);

  // 8. Navegar a Mis Videos
  const myVideosLink = page.locator('aside a[href="/videos"]').first();
  if (await myVideosLink.isVisible()) {
    await humanClick(page, myVideosLink, { pauseAfter: 1200 });
    await setBanner(page, 'Biblioteca Privada y Control de Cuota', 'El cliente solo ve sus propios spots publicitarios y su límite de videos.');
    await page.waitForTimeout(2000);
  }

  // 9. Resumen
  await setBanner(page, '¡Seguridad y Privacidad Garantizada!', 'Aislamiento estricto de datos entre marcas y empresas.');
  await page.waitForTimeout(2000);

  // Finalizar
  await finalizeVideo(page, context, OUTPUT_FILE);
  await browser.close();
  console.log('--- Video 7 finalizado con éxito ---');
}

run().catch((err) => {
  console.error('Error grabando Video 7:', err);
  process.exit(1);
});

