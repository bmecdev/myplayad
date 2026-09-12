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
  * `games/<slug>/game/`: Pantalla del juego (TV/Kiosco).
    * `index.html`: Consola LCD retro con scanlines CRT + canvas 200x160 base + overlays (QR, Hall of Fame, Próximos juegos) + reproductor de video de anuncios.
    * `style.css`: Paleta neón retro (`--bg-deep: #0a0f0d`, `--panel: #101a15`, `--phosphor: #3dff8a`, `--amber: #ffb703`, `--danger: #ff4d6d`, `--white: #eafff2`), fuentes `'Press Start 2P'` y `'VT323'`, media query `@media (orientation: landscape) { .container { flex-direction: row; } }`, renderizado `image-rendering: pixelated;`.
    * `script.js`: Bucle de juego con canvas 2d, gestión de vidas y score, motor reactivo `autoScale()` multi-etapa con `ResizeObserver`, WebSocket signaling y WebRTC Host con DataChannel.
    * `config.js`: Parámetros de señalización, TURN y endpoints.
    * `video_loop.js`: Reproducción en cola de videos de anuncios con sincronización local y overlay de próximos juegos.
    * `videos.html`: Reproductor auxiliar.
  * `games/<slug>/control/`: Controlador web móvil para el teléfono del usuario.
    * `index.html`: Pantalla de bienvenida con Nickname + interfaz táctil (joystick/trackpad/botones) + pantalla de agradecimiento al terminar la partida.
    * `style.css`: Estilo oscuro neón optimizado para dispositivos táctiles (`touch-action: none`).
    * `script.js`: Conexión WebRTC P2P con la pantalla del juego vía DataChannel, envío de comandos en tiempo real a 60fps con vibración táctil háptica.
    * `config.js`: Configuración de señalización para el cliente móvil.

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
