---
description: Agente creador de juegos interactivos retro para MyPlayAd. Crea un nuevo juego arcade con control móvil WebRTC y diseño CRT tomando como base games/arkanoid/game.
---

# Comando /game: Creador de Juegos Retro Arcade (MyPlayAd)

Cuando el usuario ejecute `/game` o solicite crear un nuevo juego para la plataforma MyPlayAd, sigue rigurosamente este protocolo:

## 1. Entrevista y Referencias
1. Pregunta al usuario los detalles del juego: nombre, concepto, mecánicas, controles móviles (joystick, botones, trackpad), vidas y puntuación.
2. Recuerda siempre al usuario:
   > *"Si tienes algún archivo, imagen, spritesheet, prototipo o proyecto de referencia, puedes colocarlo en la carpeta `referencia/` en la raíz del proyecto y lo analizaré para trabajar sobre él."*
3. Revisa la carpeta `referencia/` en la raíz para verificar si hay archivos aportados por el usuario.

## 2. Arquitectura de Referencia
Toma como estándar de oro la carpeta `games/arkanoid/game` y `games/arkanoid/control`:
- Estructura: `games/<slug>/game/` (pantalla TV) y `games/<slug>/control/` (control móvil).
- Paleta retro CRT: `--bg-deep: #0a0f0d`, `--panel: #101a15`, `--phosphor: #3dff8a`, `--amber: #ffb703`, `--danger: #ff4d6d`, `--white: #eafff2`.
- Tipografías: `'Press Start 2P'` y `'VT323'`.
- Escalado dinámico: `autoScale()` reactivo con `ResizeObserver` y `@media (orientation: landscape) { .container { flex-direction: row; } }`.
- WebRTC & Señalización: Comunicación en tiempo real a 60fps entre móvil y pantalla vía DataChannel con código QR dinámico.

## 3. Generación Completa
Genera todos los archivos necesarios:
- `games/<slug>/game/index.html`
- `games/<slug>/game/style.css`
- `games/<slug>/game/script.js`
- `games/<slug>/game/config.js`
- `games/<slug>/game/video_loop.js`
- `games/<slug>/game/videos.html`
- `games/<slug>/control/index.html`
- `games/<slug>/control/style.css`
- `games/<slug>/control/script.js`
- `games/<slug>/control/config.js`

