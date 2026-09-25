# MyPlayAd Workspace - Agent & Developer Guidelines

Este archivo contiene las directrices del proyecto y define los agentes y comandos disponibles para **Antigravity**, **Codex**, **Claude Code** y otros asistentes de IA.

---

## 🎮 Agente Creador de Juegos (`/game`)

Cuando el usuario ejecute el comando `/game` o solicite crear un nuevo juego para MyPlayAd:

### 1. Protocolo de Entrevista y Referencias
1. **Entrevistar al usuario**: Preguntarle el nombre, concepto, mecánicas, reglas, condiciones de victoria/derrota y el tipo de control móvil deseado (joystick analógico, pad direccional, trackpad, botones de acción, toques).
2. **Mensaje de Referencia Obligatorio**:
   > *"Si tienes algún archivo, imagen, spritesheet, prototipo o proyecto de referencia, puedes colocarlo en la carpeta `referencia/` en la raíz del proyecto y lo analizaré para trabajar sobre él."*
3. **Revisión de `referencia/`**: Inspeccionar la carpeta [`referencia/`](file:///Users/gonza/mycodes/myPlayAd/referencia) en la raíz para detectar cualquier recurso colocado por el usuario e incorporarlo al juego.

### 2. Estándar de Referencia: `games/arkanoid/game`
Todo nuevo juego debe replicar fielmente la arquitectura, paleta de colores CRT, renderizado de canvas y sistema de comunicación de [`games/arkanoid/game`](file:///Users/gonza/mycodes/myPlayAd/games/arkanoid/game):

* **Estructura obligatoria**:
  * `games/<slug>/game/`: Pantalla del juego (TV/Kiosco en modo Arcade Puro, centrado, a pantalla completa sin videos duplicados).
    * `index.html`: Consola LCD retro con scanlines CRT + canvas 200x160 base escalado a 400x320 + overlays (QR de 160x160 generado localmente, Hall of Fame) + footer de consola arcade con grille.
    * `style.css`: Paleta neón retro (`--bg-deep: #0a0f0d`, `--panel: #101a15`, `--phosphor: #3dff8a`, `--amber: #ffb703`, `--danger: #ff4d6d`, `--white: #eafff2`), fuentes `'Press Start 2P'` y `'VT323'`, renderizado `image-rendering: pixelated; crisp-edges;`, consola espaciosa de 440px x 400px base centrada que escala responsivamente ocupando el 95-98% de la altura de la pantalla.
    * `script.js`: Bucle de juego con canvas 2d, gestión de vidas y score, motor reactivo `autoScale()` multi-etapa con medición de dimensiones no transformadas (`offsetWidth`/`offsetHeight`), generación local instantánea de QR (`qrcode.min.js`), WebSocket signaling y WebRTC Host con DataChannel.
    * `qrcode.min.js`: Librería cliente de generación local de códigos QR (0ms latencia, sin peticiones de red externas ni bloqueos por adblockers).
    * `config.js`: Parámetros de señalización, TURN y endpoints.
  * `games/<slug>/control/`: Controlador web móvil para el teléfono del usuario.
    * `index.html`: Pantalla de bienvenida con Nickname + interfaz táctil (joystick/trackpad/botones) + pantalla de agradecimiento al terminar la partida.
    * `style.css`: Estilo oscuro neón optimizado para dispositivos táctiles (`touch-action: none`).
    * `script.js`: Conexión WebRTC P2P con la pantalla del juego vía DataChannel, envío de comandos en tiempo real a 60fps con vibración táctil háptica.
    * `config.js`: Configuración de señalización para el cliente móvil.
  * `games/<slug>/game.json`: Metadatos del minijuego (nombre, slug, icono, género, descripción y tipo de controles) consumidos por el actualizador automático del catálogo en `README.md`.

### 3. Protocolo Obligatorio WebRTC y Señalización (`server/server.js`)
Para evitar fallos de conexión P2P entre la pantalla (Host) y el teléfono (Controller), todo juego DEBE cumplir este contrato:

* **Enrutamiento por `playerId` (Crítico)**:
  * El servidor `server/server.js` asigna un `playerId` numérico al controlador y lo inyecta en cada mensaje hacia el host (`data.playerId`).
  * **El Host SIEMPRE debe responder incluyendo `playerId: data.playerId`** tanto en el mensaje `answer` como en cada `candidate`. Si se omite o se usa `to: data.from`, el servidor no encuentra el controlador y descarta la respuesta silenciosamente.
  * Mapear conexiones en el Host por `playerId`: `peerConnections.set(playerId, pc)` y `dataChannels.set(playerId, dc)`.
  * Escuchar `controller_connected` y `controller_disconnected` en el socket del Host.
* **Configuración del DataChannel en el Móvil**:
  * Crear el canal como `pc.createDataChannel('control', { ordered: false });`.
  * **NUNCA usar `maxRetransmits: 0`** en el canal principal, ya que descarta paquetes en redes móviles inestables y provoca la pérdida del mensaje inicial `{ type: 'join' }`.
  * Al abrir el canal (`onopen`), enviar `{ type: 'join', nickname: nickname, value: nickname }`.
* **Detección Dinámica de Entornos (Staging / Dev / Prod)**:
  * En `config.js` tanto de `game/` como de `control/`:
    ```javascript
    const isDevHost = typeof window !== 'undefined' && (
        window.location.hostname.includes('dev') || 
        window.location.hostname.includes('staging') || 
        window.location.hostname.includes('test')
    );
    const CONTROL_URL = isDevHost 
        ? 'https://dev-controllers.myplayad.com/<slug>' 
        : 'https://controllers.myplayad.com/<slug>';
    ```
* **Estado del Controlador Móvil**:
  * Al cargar con `?room=XXXX`, mostrar `"INGRESA TU NICKNAME"` (no `"Conectando..."` antes de que el usuario pulse el botón de jugar).

### 4. Soporte Obligatorio de Teclado y Pruebas Locales (Pre-Push)
**TODO juego DEBE poder jugarse y probarse al 100% con teclado antes de hacer push a Git.**
Esto permite al desarrollador y al agente verificar la jugabilidad, mecánicas y colisiones inmediatamente en el navegador sin requerir obligatoriamente el móvil:

* **Mapeo Obligatorio de Teclas en `game/script.js`**:
  * **Movimiento**: Flechas del cursor (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`) y teclas `WASD`.
  * **Acción / Disparo**: Tecla `Espacio`, `Enter` o `Z`/`X`.
  * **Eventos `keydown` y `keyup`**: Manejar tanto el inicio como el cese de movimiento al soltar la tecla (`keyup`) para evitar inercias o movimientos infinitos indeseados.
* **Inicio Rápido Local (Bypass del QR)**:
  * Al hacer clic en la pantalla arcade (`mainScreen.addEventListener('click', ...)`) o al presionar `Espacio`/`Enter` en el overlay de espera, el juego debe ocultar el overlay (`waitingOverlay.classList.add('hidden')`) e iniciar la partida directamente con un nickname por defecto (`PILOT` / `PLAYER 1`).
* **Protocolo de Verificación Pre-Push**:
  * **ANTES** de hacer commit o push a la rama de Staging, el juego debe probarse con teclado para comprobar:
    1. Movimiento fluido a 60fps.
    2. Detección de colisiones y límites de pantalla.
    3. Gestión correcta de vidas y suma de puntuación.
    4. Audio sintetizado Web Audio API operativo tras interacción.
    5. Transición limpia a Game Over y reinicio.

### 5. Flujo Git y CI/CD Obligatorio para Juegos (`game/<slug>`)
**PROHIBIDO desarrollar o commitear juegos directamente en `main`.**
Cualquier push a `main` dispara el despliegue a **PRODUCCIÓN** (`/var/www/myplayad/`). Para garantizar que todo juego se pruebe antes en dispositivos móviles reales sobre el VPS:

1. **Aislamiento Inicial en Rama Dedicada**:
   - **ANTES** de escribir código para un juego nuevo o refactorizar uno existente, cambiar a su rama:
     ```bash
     # Usar el script del skill o comando git:
     ./.agents/skills/game/scripts/start-game-branch.sh <slug>
     # O manualmente:
     git checkout main && git pull origin main
     git checkout -b game/<slug>
     ```
   - Verificar siempre que `git branch --show-current` sea `game/<slug>`.
2. **Despliegue Continuo a Staging**:
   - Cada `git push origin game/<slug>` activa automáticamente el workflow `.github/workflows/deploy-staging.yml`.
   - Se despliega de forma segura en `/var/www/myplayad-staging/`.
   - URLs de prueba inmediata en móvil y pantalla:
     - 📺 Pantalla: `https://dev.myplayad.com/<slug>/`
     - 📱 Control Móvil: `https://dev-controllers.myplayad.com/<slug>/`
3. **Promoción a Producción (PR y Merge)**:
   - Solo cuando el juego esté 100% probado en Staging:
     ```bash
     # Usar el script de promoción:
     ./.agents/skills/game/scripts/promote-to-main.sh <slug>
     # O crear PR manualmente:
     gh pr create --base main --head game/<slug> --title "feat(game): agregar minijuego <slug>" --body "..."
     ```
   - Al aprobar y mergear el PR a `main`, el workflow `.github/workflows/deploy.yml` lo publicará automáticamente en producción.
4. **Actualización Obligatoria del Catálogo de Juegos en `README.md`**:
   - Cada juego DEBE incluir su archivo de metadatos `games/<slug>/game.json` (nombre, slug, icon, genre, description, controls).
   - En cada merge hacia `main`, el catálogo de juegos en `README.md` se actualiza automáticamente con todos los juegos presentes en la rama principal.
   - En el pipeline de CI/CD, el workflow `.github/workflows/deploy.yml` ejecuta `python3 .agents/skills/game/scripts/update-games-readme.py` y commitea la tabla actualizada en `main` si hubo cambios.
   - Si el desarrollador o agente hace merge manual en local, debe ejecutar siempre `python3 .agents/skills/game/scripts/update-games-readme.py` antes de hacer push a `main`.

---

## 🧪 Agente de Pruebas Guiadas e Iteración (`/test`)

Cuando el usuario ejecute el comando `/test` o solicite probar, depurar o validar un minijuego:

### Regla de Oro: Comunicación Activa y Bucle de Corrección en Caliente
> [!CAUTION]
> **PROHIBIDO avanzar entre fases sin la confirmación explícita del usuario.**
> En cada etapa (teclado y móvil), el agente **SIEMPRE DEBE PREGUNTAR AL USUARIO si todo funciona bien o qué toca corregir**, y aplicar los ajustes de código de inmediato en el chat hasta que el usuario dé el visto bueno.

### Flujo Obligatorio de 3 Pasos de `/test`:
1. **Paso 1: Pruebas Locales con Teclado (Pre-Push)**:
   - Verificar sintaxis con `node -c`.
   - Indicar al usuario que abra localmente `file:///.../games/<slug>/game/index.html`.
   - Guiarlo a comprobar: inicio rápido (clic o teclas `Espacio`/`Enter`/flechas retiran el QR y arrancan la partida), fluidez a 60fps con flechas/WASD, límites de pantalla, colisiones, vidas, audio y pantalla de Game Over.
   - **Pregunta Obligatoria**:
     > *"¿Cómo se siente el juego con el teclado? ¿El movimiento, las colisiones, el inicio y el audio funcionan bien o hay algo que debamos corregir antes de subirlo a Staging?"*
   - Si el usuario reporta fallas o mejoras, corregir el código en el chat de inmediato y pedirle probar de nuevo.
2. **Paso 2: Push a Staging y Pruebas con Celular**:
   - Solo cuando el usuario aprueba el teclado, hacer `git push origin game/<slug>`.
   - Proporcionar las URLs de Staging:
     - 🖥️ Pantalla: `https://dev.myplayad.com/<slug>/`
     - 📱 Control Móvil: `https://dev-controllers.myplayad.com/<slug>/`
   - Guiar al usuario a escanear el QR o abrir el control en su teléfono real y probar: conexión DataChannel WebRTC, nickname, respuesta háptica, sensibilidad táctil del joystick/slider/botones y Game Over.
   - **Pregunta Obligatoria**:
     > *"¿Cómo se siente el control en el celular? ¿La sensibilidad, la velocidad de respuesta, el tamaño de los botones táctiles o la interfaz están bien, o qué ajustes hacemos en el código?"*
   - Si el usuario reporta que va lento, está muy sensible o hay errores, calibrar el código de inmediato, hacer push a Staging y pedirle re-probar.
3. **Paso 3: Actualización y Merge a Producción (`main`)**:
   - Solo cuando el usuario valida al 100% el juego en su celular:
     - Ejecutar `python3 .agents/skills/game/scripts/update-games-readme.py` para actualizar el catálogo de `README.md`.
     - Promover y mergear la rama `game/<slug>` hacia `main`.
     - Hacer `git push origin main` para que el CI/CD publique en `/var/www/myplayad/`.
     - Entregar las URLs de Producción verificadas.

---

## 📁 Estructura del Repositorio

* **`games/`**: Minijuegos retro interactivos (Snake, Arkanoid, Invaders, etc.).
* **`portal/`**: Panel de administración y API pública (Next.js 16, React 19, Prisma, Tailwind).
* **`screen/`**: Servidor Node.js local y frontend del reproductor que corre físicamente en cada televisor / Raspberry Pi 5.
* **`server/`**: Servidor WebSocket de señalización WebRTC y servidor STUN/TURN (Mosquitto, Coturn).
* **`referencia/`**: Carpeta donde el usuario coloca archivos, mockups, código o imágenes de referencia para nuevos juegos.

---

## 🛠️ Convenciones de Desarrollo
* Mantener la integridad de los comentarios y estándares de código existentes.
* Probar la responsividad en orientaciones horizontal (16:9) y vertical (9:16) en resoluciones 1080p y 4K.

