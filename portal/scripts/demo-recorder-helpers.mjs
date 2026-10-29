import fs from 'fs';
import path from 'path';

export const BASE_URL = process.env.PORTAL_URL || 'https://dev-portal.myplayad.com';
export const ADMIN_USER = process.env.ADMIN_USER || 'admin';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'myplayad123';

/**
 * Inyecta scripts de cursor visual y subtítulos en cada página/frame
 */
export async function injectVisualHelpers(page) {
  await page.addInitScript(() => {
    // Escuchar movimientos y clics para actualizar el cursor visual
    window.__demoCursorPos = { x: 100, y: 100 };

    window.__updateDemoCursor = (x, y, isClick = false) => {
      window.__demoCursorPos = { x, y };
      let c = document.getElementById('demo-cursor');
      if (!c) {
        c = document.createElement('div');
        c.id = 'demo-cursor';
        c.style.cssText = `
          position: fixed;
          top: 0; left: 0;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: rgba(14, 165, 233, 0.85);
          border: 2px solid #ffffff;
          box-shadow: 0 0 12px rgba(14, 165, 233, 0.9), 0 3px 6px rgba(0,0,0,0.5);
          pointer-events: none;
          z-index: 2147483647;
          transform: translate(-50%, -50%);
          transition: transform 0.05s linear;
        `;
        document.documentElement.appendChild(c);
      }
      c.style.left = `${x}px`;
      c.style.top = `${y}px`;

      if (isClick) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
          position: fixed;
          left: ${x}px; top: ${y}px;
          width: 14px; height: 14px;
          border-radius: 50%;
          border: 3px solid #38bdf8;
          background: rgba(56, 189, 248, 0.35);
          pointer-events: none;
          z-index: 2147483646;
          transform: translate(-50%, -50%) scale(1);
          transition: transform 0.45s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.45s ease-out;
          opacity: 1;
        `;
        document.documentElement.appendChild(ripple);
        requestAnimationFrame(() => {
          ripple.style.transform = 'translate(-50%, -50%) scale(3.8)';
          ripple.style.opacity = '0';
        });
        setTimeout(() => ripple.remove(), 500);
      }
    };

    window.__showDemoBanner = (title, subtitle = '') => {
      let b = document.getElementById('demo-banner');
      if (!b) {
        b = document.createElement('div');
        b.id = 'demo-banner';
        b.style.cssText = `
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(56, 189, 248, 0.45);
          color: #ffffff;
          padding: 10px 24px;
          border-radius: 9999px;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.7), 0 0 15px rgba(56, 189, 248, 0.25);
          z-index: 2147483647;
          display: flex;
          align-items: center;
          gap: 12px;
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          max-width: 90%;
        `;
        document.documentElement.appendChild(b);
      }
      b.innerHTML = `
        <span style="display:inline-block; width:11px; height:11px; border-radius:50%; background:#38bdf8; box-shadow:0 0 10px #38bdf8; flex-shrink:0;"></span>
        <div style="display:flex; flex-direction:column; line-height: 1.25;">
          <span style="font-weight:700; font-size:14px; color:#f8fafc; letter-spacing: -0.01em;">${title}</span>
          ${subtitle ? `<span style="font-size:12px; color:#94a3b8; font-weight:400; margin-top:2px;">${subtitle}</span>` : ''}
        </div>
      `;
    };
  });
}

/**
 * Actualiza el banner inferior con título y descripción
 */
export async function setBanner(page, title, subtitle = '') {
  await page.evaluate(({ t, s }) => {
    if (window.__showDemoBanner) {
      window.__showDemoBanner(t, s);
    }
  }, { t: title, s: subtitle });
}

let lastMouseX = 100;
let lastMouseY = 100;

/**
 * Mueve suavemente el cursor a unas coordenadas
 */
export async function smoothMoveTo(page, targetX, targetY, steps = 18) {
  const startX = lastMouseX;
  const startY = lastMouseY;

  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    // Función de aceleración suave (easeOutQuad)
    const eased = 1 - (1 - progress) * (1 - progress);
    const curX = Math.round(startX + (targetX - startX) * eased);
    const curY = Math.round(startY + (targetY - startY) * eased);

    await page.evaluate(({ x, y }) => {
      if (window.__updateDemoCursor) window.__updateDemoCursor(x, y, false);
    }, { x: curX, y: curY });

    await page.mouse.move(curX, curY);
    await page.waitForTimeout(16); // ~60fps
  }

  lastMouseX = targetX;
  lastMouseY = targetY;
}

/**
 * Apunta hacia un elemento, mueve suavemente el cursor, genera efecto ripple y hace click
 */
export async function humanClick(page, locatorOrSelector, options = {}) {
  const locator = typeof locatorOrSelector === 'string' ? page.locator(locatorOrSelector).first() : locatorOrSelector;
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();

  if (box) {
    const targetX = Math.round(box.x + box.width / 2);
    const targetY = Math.round(box.y + box.height / 2);

    await smoothMoveTo(page, targetX, targetY, options.steps || 18);
    await page.waitForTimeout(100);

    // Ripple click visual
    await page.evaluate(({ x, y }) => {
      if (window.__updateDemoCursor) window.__updateDemoCursor(x, y, true);
    }, { x: targetX, y: targetY });

    await page.waitForTimeout(150);
  }

  await locator.click();
  await page.waitForTimeout(options.pauseAfter || 600);
}

/**
 * Escribe texto simulando tecleo humano
 */
export async function humanType(page, locatorOrSelector, text, delay = 45) {
  await humanClick(page, locatorOrSelector, { pauseAfter: 200 });
  const locator = typeof locatorOrSelector === 'string' ? page.locator(locatorOrSelector).first() : locatorOrSelector;
  await locator.fill('');
  if (locator.pressSequentially) {
    await locator.pressSequentially(text, { delay });
  } else {
    await locator.type(text, { delay });
  }
  await page.waitForTimeout(300);
}

/**
 * Inicia sesión como Super Admin
 */
export async function loginAsAdmin(page) {
  await setBanner(page, 'Accediendo al Portal MyPlayAd', 'Iniciando sesión como Super Administrador...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Si ya estamos logueados
  if (!page.url().includes('/login')) return;

  const userInput = page.locator('input[type="text"]');
  const passInput = page.locator('input[type="password"]');
  const submitBtn = page.locator('button[type="submit"]');

  await humanType(page, userInput, ADMIN_USER, 50);
  await humanType(page, passInput, ADMIN_PASSWORD, 50);
  await humanClick(page, submitBtn, { pauseAfter: 1000 });

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 12000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Guarda el video grabado al destino final
 */
export async function finalizeVideo(page, context, outputPath) {
  // Ocultar banner antes de terminar
  await page.evaluate(() => {
    const b = document.getElementById('demo-banner');
    if (b) b.style.opacity = '0';
    const c = document.getElementById('demo-cursor');
    if (c) c.style.opacity = '0';
  });
  await page.waitForTimeout(1000);

  const video = page.video();
  await context.close();

  if (video) {
    const tempPath = await video.path();
    const targetDir = path.dirname(outputPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.copyFileSync(tempPath, outputPath);
    console.log(`✓ Video generado con éxito: ${outputPath} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
  }
}
