# Snake WebRTC Game & Ad Player - v2.2.1 🐍🎮📺

Este proyecto es una aplicación web interactiva diseñada para tótems publicitarios o kioscos digitales. Integra el juego clásico de **Snake** (HTML5 Canvas) con un **reproductor de video publicitario**, controlado remotamente desde móviles a través de **WebRTC**.

## 🚀 Novedades de la Versión 2.2.1
*   **Estabilidad de Conexiones WebSocket:** Keepalive automático (ping/pong) en servidor y reconexión automática en host para prevenir desconexiones por inactividad en producción.
*   **Arquitectura Multijugador Ready:** Servidor de señalización rediseñado para soportar múltiples controladores concurrentes mediante IDs de jugador únicos.
*   **Capacidad de Sala Configurable:** Ahora el Host define el número máximo de jugadores permitidos desde `config.js`.
*   **Gestión de Múltiples PeerConnections:** El motor del juego ahora puede mantener canales de datos independientes para cada mando conectado.
*   **Sistema de Vidas y Respawn Seguro (v2.1.0):** Algoritmo de reaparición en zigzag que protege la longitud de la serpiente tras chocar.
*   **Invulnerabilidad Temporal:** 2 segundos de protección post-muerte con feedback visual.

## 🛠️ Arquitectura del Sistema

El proyecto se divide en tres componentes modulares:

1.  **Juego Principal (`/game`):**
    *   **Snake Engine:** Lógica de juego optimizada para 60 FPS.
    *   **Multi-Connection Host:** Gestiona un `Map` de conexiones WebRTC para recibir comandos de múltiples fuentes.
    *   **Reconexión Automática:** Reintenta conexiones WebSocket caídas con backoff exponencial para máxima estabilidad.
    *   **Ad Player:** Reproductor de video vertical en bucre infinito.

2.  **Servidor de Señalización (`/server`):**
    *   Basado en **Node.js y WebSockets**.
    *   **Keepalive Automático:** Sistema de ping/pong cada 20 segundos para mantener conexiones activas y prevenir desconexiones por inactividad.
    *   **Enrutamiento Inteligente:** Entrega ofertas y candidatos ICE al destinatario correcto usando `playerId`.
    *   **Control de Aforo:** Bloquea automáticamente nuevas conexiones si la sala alcanza su capacidad máxima (`SALA_LLENA`).

3.  **Control Remoto (`/control`):**
    *   Interfaz web optimizada para smartphones.
    *   **Joystick Analógico Virtual** con respuesta táctil bloqueada.
    *   Asignación automática de `playerId` al conectar.

## 📦 Instalación y Uso

### 1. Preparar el Servidor
```bash
cd server
npm install
node server.js
```

### 2. Configurar la Conexión
Edita `game/config.js` y `control/config.js`:
```javascript
const CONFIG = {
    SIGNALING_SERVER_IP: 'TU_IP',
    SIGNALING_SERVER_PORT: '8080',
    MAX_PLAYERS: 1 // Cambia según el juego
};
```

### 3. Iniciar la Experiencia
*   **Pantalla (Host):** Abre `game/index.html`.
*   **Mando (Cliente):** Escanea el QR generado en pantalla para conectar tu móvil.

## 📁 Estructura del Proyecto

```text
/
├── control/        # Mando virtual móvil (Joystick + WebRTC)
├── game/           # Aplicación principal (Snake + Video Player)
│   ├── config.js   # Configuración de red y capacidad
│   └── script.js   # Motor del juego v2.2.0 (Multi-connection)
├── server/         # Servidor de señalización (Multi-player routing)
├── code-reviews/   # Documentación de calidad
└── REPORTE_TECNICO_MEJORAS.md
```

---
**Desarrollado por:** [Tu Nombre/Empresa] | **Arquitectura:** WebRTC P2P (Multi-source)
