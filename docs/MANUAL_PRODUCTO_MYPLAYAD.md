# Manual de Producto y Arquitectura de Sistema — MyPlayAd

---

## 1. Resumen Ejecutivo y Visión del Producto

**MyPlayAd** es una plataforma tecnológica publicitaria de cartelería digital interactiva (*Digital Out-of-Home / Phygital*) que transforma televisores y pantallas comerciales en estaciones de entretenimiento y publicidad de alto impacto.

A diferencia de la cartelería digital pasiva tradicional, MyPlayAd implementa un **Layout Dual Responsivo**:
1. **Zona Arcade Interactiva:** Minijuegos retro (Arkanoid, Snake, Space Invaders, Cyber Canyon, etc.) renderizados a 60 fps con estética CRT. Los espectadores en el punto de venta pueden escanear un código QR local con su teléfono móvil y jugar al instante como control remoto, **sin necesidad de descargar aplicaciones** (WebRTC P2P en el navegador).
2. **Zona Publicitaria de Video:** Espacio de alta visibilidad donde rotan spots de video corporativos y comerciales, sincronizados y cacheados localmente en el dispositivo para garantizar reproducción continua e ininterrumpida incluso ante caídas de conexión a Internet.

---

## 2. Arquitectura Global del Sistema

El ecosistema de MyPlayAd está compuesto por tres capas interconectadas: **Cloud & APIs**, **Edge Player (Kiosco Físico)** y **Móviles de Usuarios (Controladores WebRTC)**.

```mermaid
flowchart TD
    subgraph Cloud["Nube MyPlayAd (VPS / Docker)"]
        Portal["Portal Administrativo Web<br/>(Next.js 16 + Prisma + PostgreSQL)"]
        VideosServer["Servidor de Videos<br/>(Nginx / Storage)"]
        MQTTBroker["Broker MQTT Mosquitto<br/>(Comandos en Tiempo Real)"]
        SignalingServer["Servidor Señalización WebRTC<br/>(WebSocket Node.js)"]
    end

    subgraph Hardware["Kiosco Físico (Punto de Venta)"]
        RPi5["Raspberry Pi 5 (8GB/4GB RAM)"]
        Labwc["Compositor Wayland (labwc)<br/>+ DRM/KMS Vertical 90°"]
        NodeServer["Servidor Node.js Local (:8090)<br/>• Sincronizador de Videos (FFmpeg 720p)<br/>• Cliente MQTT CEC/Sync<br/>• Servidor Web Kiosk"]
        Chromium["Chromium Kiosk (Wayland Nativo)<br/>• Canvas Dual Layout (Juego + Anuncio)"]
        Display["Pantalla / TV Comercial 1080p / 4K<br/>(HDMI con soporte HDMI-CEC)"]
        
        RPi5 --> Labwc
        Labwc --> NodeServer
        Labwc --> Chromium
        Chromium --> Display
    end

    subgraph Users["Audiencia / Jugadores"]
        Phone["Smartphone (iOS / Android)<br/>Navegador Móvil (WebRTC DataChannel 60fps)"]
    end

    %% Conexiones
    Portal -.->|Publica Comandos| MQTTBroker
    Portal -.->|Registra y Asigna| VideosServer
    MQTTBroker ==>|Comandos POWER / SYNC| NodeServer
    VideosServer ==>|Descarga de Videos .mp4| NodeServer
    SignalingServer <==>|Handshake SDP / ICE| Chromium
    SignalingServer <==>|Handshake SDP / ICE| Phone
    Phone <==>|Canal de Datos P2P Directo (0ms)| Chromium
```

---

## 3. Especificaciones de Hardware del Kiosco

Para garantizar una operación ininterrumpida 24/7 en locales comerciales, el hardware de cada punto de venta cumple con las siguientes especificaciones:

| Componente | Especificación Recomendada | Función en MyPlayAd |
| :--- | :--- | :--- |
| **Computador Kiosco** | Raspberry Pi 5 (4GB u 8GB RAM) | Reproducción dual de video y juegos a 60 fps bajo Debian GNU/Linux 13. |
| **Almacenamiento** | MicroSD A2 Clase 10 (32GB o 64GB) | Sistema operativo, almacenamiento en caché local de videos y binarios de juegos. |
| **Refrigeración** | Cooler activo oficial o disipador pasivo de aluminio | Prevención de *thermal throttling* en reproducción continua de video 24/7. |
| **Conectividad de Video** | Cable Micro-HDMI a HDMI con soporte CEC | Transmisión de video a 1080p/4K y control remoto de energía (encendido/apagado de TV). |
| **Pantalla / Monitor** | Televisor o Display Comercial (Full HD o 4K) | Orientación vertical (9:16) u horizontal (16:9) con HDMI-CEC habilitado. |
| **Alimentación** | Fuente oficial Raspberry Pi 27W USB-C (5V / 5A) | Suministro eléctrico estable para evitar bloqueos por bajo voltaje. |

---

## 4. Arquitectura de Software del Kiosco (`screen/`)

El reproductor físico implementa una arquitectura autónoma optimizada para arranque desatendido:

### 4.1. Rotación Vertical por Hardware (Kernel DRM/KMS)
En lugar de forzar a Chromium o a la CPU a transformar y rotar cada frame en memoria, la rotación de pantalla se delega al Kernel de Linux vía `/boot/firmware/cmdline.txt`:
```text
video=HDMI-A-1:1920x1080@60,rotate=90
```
Esto garantiza aceleración gráfica fluida por GPU (`v3d`) y libera el 100% de la CPU para el juego y el video.

### 4.2. Compositor Wayland Ultraligero (`labwc`)
Se reemplaza el entorno de escritorio tradicional (X11 / PIXEL) por `labwc`, un compositor Wayland minimalista sin barras de tareas, iconos, ventanas ni fondos de escritorio que consuman recursos.

### 4.3. Servidor Node.js Local (`server.js` en `:8090`)
Cada Raspberry Pi corre un micro-servidor local autónomo con las siguientes responsabilidades:
* **Sincronización Inteligente de Videos:** Consulta la API central (`https://videos.myplayad.com/api/screen/:id`) para conocer su lista de reproducción asignada. Descarga automáticamente videos nuevos y purga videos obsoletos.
* **Transcodificación Local con FFmpeg:** Al descargar un video, FFmpeg lo re-escala localmente a 720p con perfiles optimizados para hardware ARM, garantizando reproducción simultánea del video publicitario sin tirones mientras corre el motor arcade.
* **Escucha MQTT en Tiempo Real:** Conectado al broker central, recibe comandos instantáneos:
  * `SYNC_VIDEOS`: Fuerza la actualización inmediata del contenido publicitario.
  * `POWER_ON` / `POWER_OFF`: Envía señales CEC mediante `cec-utils` por el puerto HDMI para apagar o encender el televisor sin intervención humana.
* **Streaming Server-Sent Events (SSE):** Mantiene un canal abierto hacia la interfaz de Chromium para recargar la lista de videos en caliente en cuanto finaliza una descarga.

### 4.4. Chromium en Modo Kiosco Blindado
Chromium se lanza directamente sobre Wayland con flags estrictas para operación comercial desatendida:
* `--ozone-platform=wayland`: Renderizado nativo sobre Wayland sin necesidad de servidor X11 intermedio.
* `--password-store=basic`: Desactiva por completo las solicitudes de desbloqueo de GNOME Keyring al iniciar sesión automática.
* `--autoplay-policy=no-user-gesture-required`: Permite la reproducción automática y en bucle de videos con audio/video sin requerir clics humanos.
* `--kiosk --noerrdialogs --disable-infobars`: Oculta cualquier mensaje de error, diálogos de traducción o bordes de ventana.

### 4.5. Ocultamiento de Puntero de Ratón
Para una estética arcade limpia, se combinan dos técnicas:
1. Generación de un tema de cursor vacío a nivel de sistema Wayland (`~/.icons/empty`).
2. Regla CSS global en la aplicación web: `* { cursor: none !important; }`.

---

## 5. Motor Arcade y Control Móvil WebRTC (`games/`)

1. **Latencia Cero en QR:** Cada minijuego incluye su propio generador local de códigos QR (`qrcode.min.js`), eliminando peticiones a APIs externas de Google Charts o CDN y garantizando que el QR aparezca al instante en pantalla.
2. **Conexión P2P Directa (WebRTC DataChannel):** Cuando el usuario escanea el código con su cámara, se conecta a `dev-controllers.myplayad.com` o `controllers.myplayad.com`. Tras un breve intercambio de señalización WebSocket (STUN/TURN), la comunicación entre el móvil y la pantalla pasa a ser directa Peer-to-Peer a través de un canal de datos binario de alta frecuencia (60Hz) con vibración háptica al pulsar botones o mover el pad direccional.
3. **Validación de Identidad y Nickname:** El sistema exige al jugador ingresar un apodo de al menos 2 caracteres antes de habilitar el control, impidiendo inicios de partida accidentales.

---

## 6. Guía de Instalación y Despliegue de un Kiosco

### Paso 1: Flasheo de la Tarjeta MicroSD
1. Descarga e instala **Raspberry Pi Imager**.
2. Selecciona:
   * **Dispositivo:** Raspberry Pi 5.
   * **Sistema Operativo:** *Raspberry Pi OS (64-bit)* basado en Debian Bookworm/Trixie.
3. En las opciones de personalización (engranaje):
   * Asignar nombre de host: ej. `MyPlayAd1`.
   * Crear usuario y contraseña (el instalador soporta cualquier nombre de usuario: `screen`, `consola1`, `consola2`, etc.).
   * Configurar red Wi-Fi o conexión cableada Ethernet.
   * Habilitar servicio SSH con autenticación de clave o contraseña.

### Paso 2: Identificador Único de Pantalla (`config.txt`)
En la partición de arranque de la MicroSD (`/boot/firmware/config.txt`), añade al final del archivo el ID generado en el Portal Web para esa pantalla:
```ini
# Configuración MyPlayAd Screen
SCREEN_ID="b34ab9d7-3639-4cbf-85b8-b5bbd306c1ef"
SCREEN_ROTATE=90
SCREEN_RESOLUTION=1920x1080
```

### Paso 3: Clonar el Repositorio y Ejecutar el Instalador
Conéctate por SSH a la Raspberry Pi y ejecuta:
```bash
# Clonar el proyecto
git clone https://github.com/tu-usuario/myPlayAd.git ~/screen

# Entrar y ejecutar el instalador desatendido
cd ~/screen/screen
chmod +x setup_kiosk.sh
sudo ./setup_kiosk.sh
```

El script `setup_kiosk.sh` realiza automáticamente:
* Instalación de herramientas del sistema (`curl`, `git`, `ffmpeg`, `cec-utils`, `swaybg`, `kanshi`, `chromium`).
* Detección e instalación automática de **Node.js 20 LTS** y `npm`.
* Compilación y resolución de dependencias npm (`npm install --omit=dev`).
* Configuración de rotación DRM/KMS en el Kernel.
* Creación del cursor invisible.
* Configuración de inicio automático con Labwc, verificación de conectividad previa de Node y flags blindadas de Chromium.

### Paso 4: Reiniciar
```bash
sudo reboot
```
La Raspberry Pi encenderá directamente en modo kiosco vertical a pantalla completa.

---

## 7. Mantenimiento y Operación

### Diagnóstico Rápido por SSH
* **Ver logs del servidor en tiempo real:**
  ```bash
  tail -f ~/screen/server.log
  ```
* **Probar encendido/apagado del televisor mediante HDMI-CEC:**
  ```bash
  bash ~/screen/power.sh on
  bash ~/screen/power.sh off
  ```
* **Comprobar videos descargados en la pantalla:**
  ```bash
  ls -lh ~/screen/videos/*/
  ```
* **Actualización en caliente del software:**
  ```bash
  bash ~/screen/update.sh
  ```

