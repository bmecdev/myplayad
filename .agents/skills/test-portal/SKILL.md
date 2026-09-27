---
name: test-portal
description: Agente y comando de pruebas automatizadas del Portal MyPlayAd (/test-portal). Ejecuta pruebas de backend con cURL y pruebas de frontend con Playwright cubriendo autenticación, pantallas, filtro por cliente, control de energía masivo HDMI-CEC, videos, cuotas de rotación por plan y endpoints públicos de kiosk.
---

# Agente de Pruebas Automatizadas del Portal MyPlayAd (`/test-portal`)

Este agente se activa cuando el usuario escribe `/test-portal` o solicita verificar, probar o depurar el **Portal Web de MyPlayAd**.

Aplica una estrategia de testing dividida en dos pilares fundamentales:
1. **Frontend (UI & Experiencia de Usuario)**: Ejecutado mediante **Playwright** en modo headless, validando renderizado, formularios, navegación, apertura de modales, selectores y límites visibles.
2. **Backend (APIs & Lógica de Negocio)**: Ejecutado mediante **cURL** con aserciones estrictas de códigos de estado HTTP (200, 400, 401, 403, 405), esquemas JSON, cabeceras CORS, cookies de sesión y validación de cuotas.

---

## 🚀 Modos de Ejecución

El agente o desarrollador puede ejecutar las pruebas directamente con el helper o comandos npm:

### 1. Suite Completa (Backend + Frontend)
```bash
./.agents/skills/test-portal/scripts/run-portal-tests.sh
# o desde portal/
npm test
```

### 2. Solo Pruebas de Backend (cURL)
```bash
./.agents/skills/test-portal/scripts/run-portal-tests.sh --backend
# o desde portal/
npm run test:backend
```

### 3. Solo Pruebas de Frontend (Playwright)
```bash
./.agents/skills/test-portal/scripts/run-portal-tests.sh --frontend
# o desde portal/
npm run test:frontend
```

### 4. Personalizar Servidor Objetivo (Localhost, Staging, Producción)
Por defecto las pruebas apuntan a Staging (`https://dev-portal.myplayad.com`). Se puede apuntar a cualquier entorno definiendo `PORTAL_URL`:
```bash
# Apuntar a entorno local de desarrollo:
./.agents/skills/test-portal/scripts/run-portal-tests.sh --target http://localhost:3000

# Apuntar a producción:
./.agents/skills/test-portal/scripts/run-portal-tests.sh --target https://portal.myplayad.com
```

---

## 📋 Matriz de Cobertura de Pruebas

### 🌐 Frontend (Playwright) - `portal/tests/frontend/`
| Archivo | Módulo | Aspectos Clave Validados |
| :--- | :--- | :--- |
| [`01-auth.spec.ts`](file:///Users/gonza/mycodes/myPlayAd/portal/tests/frontend/01-auth.spec.ts) | Autenticación | Renderizado de formulario, alertas de error ante credenciales inválidas, login exitoso con redirección limpia al dashboard. |
| [`02-screens.spec.ts`](file:///Users/gonza/mycodes/myPlayAd/portal/tests/frontend/02-screens.spec.ts) | Pantallas & Energía | Título y layout, filtro por cliente en Super Admin (dropdown con "Todos los clientes" y "Sin asignar"), botones de acción masiva (`Encender Todas` / `Apagar Todas`), badges de cuota de videos en rotación (`X / Y videos en rotación`) y modal de actualizaciones OTA. |
| [`03-videos.spec.ts`](file:///Users/gonza/mycodes/myPlayAd/portal/tests/frontend/03-videos.spec.ts) | Videos & Asignación | Galería de videos con badges de cliente dueño, filtro de videos por cliente en Super Admin, modal de subida con selector de cliente propietario y selector de pantallas con indicador de ocupación (`X / Y videos usados`). |
| [`04-plans.spec.ts`](file:///Users/gonza/mycodes/myPlayAd/portal/tests/frontend/04-plans.spec.ts) | Planes & Cuotas | Tarjetas de planes con badge de `maxVideosPerScreen` (`X videos por pantalla`), modal de creación/edición de planes con campo numérico de límite de videos por pantalla. |

### ⚡ Backend (cURL) - `portal/tests/backend/`
| Archivo | Módulo | Aspectos Clave Validados |
| :--- | :--- | :--- |
| [`01-auth.sh`](file:///Users/gonza/mycodes/myPlayAd/portal/tests/backend/01-auth.sh) | `/api/auth/*` | Rechazo de credenciales falsas (HTTP 401/JSON de error), login exitoso con cookie HMAC-SHA256 `myplayad_session`, consulta `/api/auth/me` con rol `SUPER_ADMIN`, bloqueo 401 en rutas protegidas sin cookie, y logout limpio. |
| [`02-plans.sh`](file:///Users/gonza/mycodes/myPlayAd/portal/tests/backend/02-plans.sh) | `/api/plans/*` | Consulta de planes disponibles, validación del campo de cuota `maxVideosPerScreen`, slugs y relación con juegos arcade permitidos. |
| [`03-screens.sh`](file:///Users/gonza/mycodes/myPlayAd/portal/tests/backend/03-screens.sh) | `/api/screens/*` | Listado de pantallas, filtro por cliente `?userId=UNASSIGNED`, encendido masivo `POWER_ON` vía MQTT, apagado masivo `POWER_OFF`, y validación de error 400 ante payloads inválidos. |
| [`04-videos.sh`](file:///Users/gonza/mycodes/myPlayAd/portal/tests/backend/04-videos.sh) | `/api/videos/*` | Listado de videos con relaciones `user` y `userId`, filtro `?userId=UNASSIGNED`, validación de estructura de arrays en `PUT /api/videos/[id]/screens` (HTTP 400), y rechazo a métodos no soportados (HTTP 405). |
| [`05-kiosk-public.sh`](file:///Users/gonza/mycodes/myPlayAd/portal/tests/backend/05-kiosk-public.sh) | `/api/public/*` | Pre-flight CORS `OPTIONS` con `Access-Control-Allow-Origin: *`, consulta sin autenticación de contenido activo para el reproductor kiosk (`/current`), y endpoint de heartbeat del Raspberry Pi. |

---

## 🛠️ Protocolo del Agente ante Fallos

1. **Lectura Detallada del Error**:
   - En Playwright: revisar el selector fallido o timeout en `test-results/`.
   - En cURL: revisar el código HTTP obtenido vs esperado y el body de respuesta.
2. **Corrección Inmediata en el Código**:
   - Si es un bug de backend (ej. validación incorrecta, error 500), corregir en `portal/src/app/api/...`.
   - Si es un bug de frontend (ej. un botón o selector no reactivo), ajustar en `portal/src/app/...`.
3. **Re-ejecución Inmediata**:
   - Volver a correr la prueba correspondiente hasta obtener 100% PASS.
4. **Reporte al Usuario**:
   - Entregar al usuario un resumen con el desglose de pruebas aprobadas, tiempo de ejecución y estado de los entornos probados.
