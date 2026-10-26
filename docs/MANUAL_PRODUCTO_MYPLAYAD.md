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

## 3. Modalidades Físicas de Pantallas & Conectividad 4G (Plug & Play)

MyPlayAd dispone de dos formatos de hardware diseñados específicamente para satisfacer las necesidades de visibilidad comercial y movilidad:

```mermaid
flowchart LR
    subgraph ModGrande["🏢 Pantalla Grande Fija"]
        direction TB
        G1["Tótem Vertical 43\" - 65\"+ (4K)"]
        G2["Chasis Fijo Antivandálico"]
        G3["Centros Comerciales / Malls"]
    end

    subgraph ModPortable["🏪 Pantalla Mediana Portable"]
        direction TB
        P1["Display Compacto 32\" - 43\" (1080p)"]
        P2["Atril Portable / Soporte Rápido"]
        P3["Negocios, Ferias y Stands"]
    end

    subgraph Conectividad["📶 Conexión 4G LTE Incluida"]
        C1["Módem Celular Industrial Integrado"]
        C2["SIM de Datos Multi-Operador"]
        C3["⚡ Solo requiere electricidad (Plug & Play)"]
    end

    ModGrande --> Conectividad
    ModPortable --> Conectividad
```

### 3.1. Pantalla Grande Fija (Para Centros Comerciales / CC y Malls)
* **Entorno Objetivo:** Pasillos principales, plazas de eventos, accesos peatonales y plazoletas de comidas en Centros Comerciales (CC / Malls) de alto tránsito.
* **Formato Físico:** Tótem vertical estilizado de 43", 55" o 65"+ con panel LCD/LED de alto brillo y resolución Full HD o 4K.
* **Seguridad y Resistencia:** Chasis metálico con anclaje firme al suelo, vidrio templado frontal de alta resistencia a golpes y cerraduras de seguridad para proteger el hardware interno.
* **Objetivo Comercial:** Máximo impacto visual publicitario, entretenimiento masivo y permanencia prolongada del cliente frente a las marcas pautantes.

### 3.2. Pantalla Mediana Portable (Para Negocios Locales, Ferias y Stands)
* **Entorno Objetivo:** Locales comerciales independientes (retail, bares, restaurantes, gimnasios), ferias de exposición, stands comerciales temporales y eventos corporativos.
* **Formato Físico:** Pantalla compacta de 32" a 43" en orientación vertical montada sobre base portable ligera o atril ajustable.
* **Facilidad de Transporte:** Pesa significativamente menos y permite ser trasladada e instalada en menos de 5 minutos por una sola persona.
* **Objetivo Comercial:** Flexibilidad para activar promociones temporales, capturar la atención en pasillos de ferias y ambientar puntos de venta con espacio moderado.

### 3.3. Módulo de Conectividad 4G LTE Incluido: "¡Lo único que necesitas es electricidad!"
Tradicionalmente, instalar cartelería digital en un centro comercial o en un stand de feria requería trámites burocráticos con el departamento de TI, solicitar permisos de apertura de puertos en firewalls o pagar costosos puntos de red cableados.

MyPlayAd elimina completamente esta fricción:
* **Módem Celular 4G LTE Integrado:** Cada estación física cuenta con un módem industrial USB/PCIe con antena de alta ganancia y SIM de datos multi-operador ya configurada.
* **Cero Configuración de Red Local:** No requiere solicitar contraseñas de redes Wi-Fi públicas ni lidiar con portales cautivos.
* **Plug & Play Total:** **¡Lo único que necesitas es una toma de electricidad (110V/220V)!** Al conectar el enchufe, la pantalla enciende, se conecta a Internet mediante 4G en menos de 10 segundos, contacta al Portal MyPlayAd, sincroniza los videos locales y comienza su rotación publicitaria y juegos arcade.

---

## 4. Especificaciones de Hardware del Kiosco

Para garantizar una operación ininterrumpida 24/7 en locales comerciales, el hardware interno de cada punto de venta cumple con las siguientes especificaciones:

| Componente | Especificación Recomendada | Función en MyPlayAd |
| :--- | :--- | :--- |
| **Computador Kiosco** | Raspberry Pi 5 (4GB u 8GB RAM) | Reproducción dual de video y juegos a 60 fps bajo Debian GNU/Linux 13. |
| **Módem Celular** | Módulo 4G LTE Industrial (SIM multi-operador) | Conectividad autónoma a Internet sin requerir Wi-Fi ni red cableada local. |
| **Almacenamiento** | MicroSD A2 Clase 10 (32GB o 64GB) | Sistema operativo, almacenamiento en caché local de videos y binarios de juegos. |
| **Refrigeración** | Cooler activo oficial o disipador pasivo de aluminio | Prevención de *thermal throttling* en reproducción continua de video 24/7. |
| **Conectividad de Video** | Cable Micro-HDMI a HDMI con soporte CEC | Transmisión de video a 1080p/4K y control remoto de energía (encendido/apagado de TV). |
| **Pantalla / Monitor** | Televisor o Display Comercial (Full HD o 4K) | Orientación vertical (9:16) con HDMI-CEC habilitado. |
| **Alimentación** | Fuente oficial Raspberry Pi 27W USB-C (5V / 5A) | Suministro eléctrico estable para evitar bloqueos por bajo voltaje. |

---

## 5. Arquitectura de Software del Kiosco (`screen/`)

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

### 4.6. Desactivación Total de Reposo del Sistema Operativo (`disable_sleep.sh`)
Para evitar que el Raspberry Pi 5 o el sistema operativo Debian/Wayland entren en modo ahorro de energía, suspensión o pantalla negra por falta de interacción física de ratón/teclado, el sistema ejecuta `screen/disable_sleep.sh`:
* Enmascara y deshabilita en `systemd` los objetivos: `sleep.target`, `suspend.target`, `hibernate.target` y `hybrid-sleep.target`.
* Desactiva el apagado automático de señal HDMI (DPMS timeout = 0) en el compositor Wayland.
* Asegura que el monitor comercial **únicamente** se apague o encienda cuando el Super Administrador envíe los comandos remotos `POWER_OFF` / `POWER_ON` (HDMI-CEC) desde el Portal.

### 4.7. Suspensión Automática por Inactividad o Vencimiento del Cliente
El reproductor local consulta de forma periódica (`/api/public/screens/:id/current` y `/api/public/screens/:id/videos`) y reacciona de inmediato ante eventos MQTT `SYNC`:
* **Cliente Inactivo:** Si el Super Administrador pausa la cuenta del cliente comercial, la pantalla entra de inmediato en modo Standby.
* **Plan Vencido:** Si la fecha límite de vigencia de la suscripción del cliente expira (`planEndsAt < hoy`), el sistema suspende de forma automática la pantalla.
* Mientras la pantalla esté en suspensión comercial por inactividad o plan vencido, **no reproducirá videos publicitarios ni minijuegos arcade** hasta que la cuenta sea reactivada y cuente con un plan vigente.

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
* **Desactivar reposo automático del sistema operativo en el Raspberry Pi:**
  ```bash
  sudo bash ~/screen/disable_sleep.sh
  ```
* **Asociación de Consola física en el Portal:**
  En el Portal MyPlayAd (módulo Pantallas), cada pantalla física puede vincularse con el identificador de la consola (ej. `consola1`, `consola2`) para saber con precisión qué equipo físico y usuario de Linux está operando en cada punto de venta.

---

## 8. Control de Energía y Horarios Programados (Auto Power HDMI-CEC)

Para maximizar la vida útil del display y minimizar el consumo de energía en horas no laborales, el sistema incorpora un motor inteligente de programación diaria de encendido y apagado:

* **Horario de Encendido y Apagado:** Configurable por pantalla (por defecto `08:00` a `22:00`).
* **Ejecución Automática por MQTT:** El servicio `powerScheduler` evalúa cada minuto el estado de las pantallas y despacha comandos `POWER_ON` o `POWER_OFF` hacia el broker MQTT.
* **Control Físico HDMI-CEC:** Al recibir `POWER_OFF`, la Raspberry Pi ejecuta `screen/power.sh off` poniendo el televisor en standby real mediante comandos nativos CEC (`echo "standby 0" | cec-client`). Al llegar la hora de encendido (`POWER_ON`), despierta el televisor y activa la entrada HDMI correspondiente (`echo "on 0" | cec-client`).
* **Capa de Respaldo por Sondeo (Polling):** Si la pantalla se reinicia fuera de horario, la API `/api/public/screens/:id/current` responde indicando que se encuentra en reposo programado (`scheduledPowerOff: true`), activando inmediatamente el modo de reposo visual.

---

## 9. Segmentación Estricta de Videos por Cliente

Para salvaguardar la privacidad comercial y evitar que videos de un cliente se reproduzcan en pantallas ajenas:

1. **Aislamiento a Nivel de Base de Datos:**
   * Cada video tiene asignado un propietario (`video.userId`).
   * Cada pantalla asignada a un cliente tiene un propietario (`screen.userId`).
2. **Validación en Servidor:**
   * Al asignar videos existentes en el detalle de una pantalla, la API restringe la consulta estrictamente a los videos pertenecientes al cliente dueño de esa pantalla.
   * La API pública `/api/public/screens/:id/videos` que descarga los videos en el reproductor físico filtra en su consulta SQL/Prisma que los videos pertenezcan al mismo `userId` de la pantalla.
   * Si un Super Admin o usuario intenta asignar un video perteneciente al Cliente A en una pantalla del Cliente B, el sistema rechaza la operación con código HTTP 400/403.


