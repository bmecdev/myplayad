# MyPlayAd - Claude Code Guidelines & Game Creator Agent

Este repositorio contiene la plataforma de cartelería digital interactiva y minijuegos arcade retro MyPlayAd.

## 🕹️ Comando /game: Creador de Juegos Retro Arcade

Al recibir el comando `/game`:
1. **Entrevista al usuario** sobre el concepto, mecánicas, reglas y controles móviles deseados.
2. **Pide referencias**: Dile al usuario que si tiene algún archivo, código o imagen de referencia, puede ponerlo en la carpeta `referencia/` en la raíz del proyecto.
3. **Revisa `referencia/`** para incorporar los elementos que haya puesto el usuario.
4. **Toma `games/arkanoid/game` y `games/arkanoid/control` como plantilla estándar** para generar el nuevo juego en `games/<slug>/` respetando:
   - Paleta CRT (`--bg-deep: #0a0f0d`, `--phosphor: #3dff8a`, `--amber: #ffb703`, `--danger: #ff4d6d`, `--white: #eafff2`).
   - Fuentes `'Press Start 2P'` y `'VT323'`.
   - Motor reactivo `autoScale()` y `@media (orientation: landscape) { .container { flex-direction: row; } }`.
   - WebRTC DataChannel en tiempo real con código QR dinámico.

## 📁 Módulos del Proyecto
- `games/`: Juegos retro arcade (Snake, Arkanoid, Invaders).
- `portal/`: Panel web y API en Next.js 16 + React 19 + Prisma.
- `screen/`: Servidor de pantalla local y reproductor kiosco para Raspberry Pi 5.
- `server/`: Servidor de señalización WebSockets y WebRTC TURN.
- `referencia/`: Carpeta para referencias de nuevos juegos.

