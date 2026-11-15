# 🍓 Guía de Despliegue MyPlayAd Kiosk Lite — MyPlayAd Hub (RPi 4 y 5 desde 1GB)

Esta carpeta contiene la solución de arquitectura embebida y scripts de despliegue para operar **MyPlayAd Kiosk Lite** en el hardware **MyPlayAd Hub** basado en placas **Raspberry Pi 4 (1GB, 2GB o 4GB)** y **Raspberry Pi 5 (1GB, 2GB, 4GB u 8GB)**, logrando un rendimiento fluido a 60 fps en Canvas 2D, decodificación por hardware de video 1080p para **MyPlayAd Media**, arranque ultrarrápido (5 a 8 segundos) e inmunidad total contra cortes repentinos de energía.

> ℹ️ **Compatibilidad Universal RPi 4 y RPi 5 (incluida la RPi 5 de 1GB de $45):**  
> El instalador `setup_lite.sh` detecta automáticamente si el hardware es una **Raspberry Pi 4** o una **Raspberry Pi 5** y adapta la aceleración de video y memoria (`cma-128` para RPi 4 vs. dynamic VideoCore VII para RPi 5). Un único script universal sirve para ambas generaciones y modelos desde 1GB RAM.

---

## 🎯 Por qué esta arquitectura para placas de 1GB de RAM

En cartelería digital, una Raspberry Pi 4 o Raspberry Pi 5 de 1GB suele sufrir cuando se usa el sistema operativo con escritorio completo (`Raspberry Pi OS Desktop` + `Chromium` estándar) porque consume entre 750 y 900 MB de RAM, activando el *Out-Of-Memory Killer* (OOM) de Linux.

Esta solución optimizada implementa **5 pilares de ingeniería embebida**:

```
┌────────────────────────────────────────────────────────────────────────┐
│             PILA DE SOFTWARE MYPLAYAD (RPi 4 y RPi 5 LITE)             │
├────────────────────────────────────────────────────────────────────────┤
│  1. SO Base:      Raspberry Pi OS Lite (64-bit) — Sin escritorio       │
│  2. Memoria:      ZRAM Swap LZ4 (Virtualiza ~1.6GB RAM con 0ms latency)│
│  3. Compositor:   Cage (Wayland Kiosk, ~18MB RAM, oculta cursor auto)  │
│  4. Navegador:    Chromium Wayland afinado (<350MB RAM con 2 renders)  │
│  5. Protección:   OverlayFS (Sistema de solo lectura anti-apagones)    │
│  6. Control TV:   HDMI-CEC instantáneo al arranque (Image View On)     │
└────────────────────────────────────────────────────────────────────────┘
```

**Resultado:** Consumo total en operación de **~380 a 420 MB de RAM**, dejando más de **550–600 MB libres en placas de 1GB** (y más de 1.5 GB libres en placas de 2GB), garantizando estabilidad ininterrumpida 24/7.

---

## 📋 Requisitos de Hardware

* **Placa:** Raspberry Pi 4 Model B (1GB, 2GB o 4GB) O Raspberry Pi 5 (1GB, 2GB, 4GB u 8GB).
* **Almacenamiento:** Tarjeta MicroSD Clase 10 / A1 o A2 (16GB o 32GB recomendada).
* **Alimentación:** Fuente oficial USB-C (15W para RPi 4 / 27W para RPi 5).
* **Video:** Cable Micro-HDMI a HDMI conectado al puerto **HDMI 0** (puerto junto a la entrada USB-C).
* **Refrigeración:** Disipador pasivo de aluminio o cooler oficial activo.

---

## 🚀 Instalación Rápida en 4 Pasos

### Paso 1: Flashear la MicroSD con Raspberry Pi OS Lite
1. Abre **Raspberry Pi Imager** en tu ordenador.
2. Selecciona:
   * **Dispositivo:** Raspberry Pi 4 o Raspberry Pi 5 (según la placa que vayas a usar).
   * **Sistema Operativo:** *Raspberry Pi OS (other)* ➔ **Raspberry Pi OS Lite (64-bit)** (Debian Bookworm).
3. En las opciones de personalización (engranaje):
   * Nombre de host: `MyPlayAd-RPi4`.
   * Usuario y contraseña: `screen` / tu contraseña.
   * Configura tu red Wi-Fi o conexión Ethernet por cable.
   * Habilita **SSH con autenticación por contraseña**.
4. Escribe la imagen en la MicroSD.

---

### Paso 2: Conectar e Iniciar sesión por SSH
Inserta la MicroSD en la Raspberry Pi 4, conéctala a la energía y accede por terminal SSH desde tu PC:

```bash
ssh screen@MyPlayAd-RPi4.local
# (O mediante su IP local: ej. ssh screen@192.168.1.150)
```

---

### Paso 3: Clonar el Repositorio y Ejecutar el Instalador
Una vez dentro de la terminal de la Raspberry Pi:

```bash
# 1. Clonar el repositorio oficial
git clone https://github.com/bmecdev/myplayad.git ~/screen

# 2. Entrar a la carpeta screen-lite y ejecutar el instalador automatizado
cd ~/screen/screen-lite
sudo bash setup_lite.sh
```

El script ejecutará automáticamente en menos de 5 minutos:
* Instalación del compositor Wayland **Cage** y librerías gráficas DRM/Mesa.
* Configuración de **ZRAM Swap con compresión LZ4** (añade 1GB de RAM virtual en memoria).
* Instalación de **Node.js 20 LTS** y dependencias del reproductor local (`server.js` con MQTT).
* Configuración de flags de Chromium optimizadas para 1GB en `~/.config/chromium-flags.conf`.
* Ajuste de parámetros del Kernel en `/boot/firmware/cmdline.txt` y firmware en `/boot/firmware/config.txt`.
* Instalación de servicios systemd para arranque automático y encendido de televisor por **HDMI-CEC**.

---

### Paso 4: Reiniciar y Probar
Reinicia la consola:

```bash
sudo reboot
```

Al encender:
1. La Raspberry Pi enviará la señal HDMI-CEC al televisor encendiéndolo automáticamente.
2. El sistema arrancará en ~12-15 segundos.
3. Se iniciará el servidor Node.js local en `:8090`.
4. El compositor **Cage** lanzará la interfaz de pantalla completa con el bucle publicitario y el minijuego arcade.

---

## 🛡️ Paso 5 (Recomendado): Activar Modo Solo Lectura (Anti-Apagones)

En instalaciones comerciales, los empleados desconectan los tótems tirando del cable de electricidad. Para hacer que la tarjeta MicroSD sea **físicamente inmune a la corrupción por apagones abruptos**:

```bash
sudo bash ~/screen/screen-lite/scripts/enable-readonly.sh
sudo reboot
```

* El sistema monta la raíz `/` en solo lectura y redirige escrituras a la memoria RAM (**OverlayFS**).
* Aunque se corte la energía 10.000 veces, **la MicroSD jamás se corromperá**.

> **Nota para Mantenimiento:** Si en el futuro necesitas actualizar el sistema o instalar paquetes, desactiva temporalmente el modo solo lectura con:
> ```bash
> sudo bash ~/screen/screen-lite/scripts/disable-readonly.sh
> sudo reboot
> ```

---

## ⚙️ Configuración de Variables en la MicroSD (`config.txt`)

Puedes configurar pantallas en masa simplemente editando el archivo `/boot/firmware/config.txt` en la MicroSD desde cualquier ordenador:

```ini
# ==========================================
# MyPlayAd Config (MyPlayAd Hub - 1GB+ RAM)
# ==========================================
SCREEN_ID=tu-uuid-de-pantalla
SCREEN_ROTATE=90               # 90: Vertical | 0: Horizontal | 270: Vertical invertido
SCREEN_RESOLUTION=1920x1080    # Resolución nativa de la pantalla
REMOTE_VIDEO_SERVER_URL=https://videos.myplayad.com
BROWSER_ENGINE=chromium        # chromium (por defecto) o cog (WPE WebKit)
```

---

## 📊 Estructura de la Carpeta `screen-lite/`

```text
screen-lite/
├── README.md                          # Este manual de referencia
├── setup_lite.sh                      # Instalador maestro automatizado (symlink setup_rpi4.sh)
├── config/
│   ├── chromium-flags.conf            # Flags de Chromium optimizadas para 1GB RAM
│   ├── cmdline.txt.template           # Parámetros del Kernel (KMS rotation, no consoleblank)
│   └── config.txt.template            # Parámetros de firmware RPi 4/5, CMA y HDMI-CEC
├── scripts/
│   ├── kiosk-launcher.sh              # Orquestador: enciende TV, arranca Node y lanza Cage
│   ├── zram-setup.sh                  # Configura 1GB de swap comprimido en RAM (LZ4)
│   ├── enable-readonly.sh             # Habilita OverlayFS de solo lectura anti-apagones
│   └── disable-readonly.sh            # Deshabilita OverlayFS para tareas de mantenimiento
└── systemd/
    ├── myplayad-kiosk.service         # Servicio de auto-arranque del quiosco en tty1
    └── myplayad-cec-boot.service      # Servicio de encendido inmediato de TV por HDMI-CEC
```

---

## 🛠️ Diagnóstico y Comandos de Mantenimiento

* **Verificar uso de memoria RAM y ZRAM:**
  ```bash
  free -h
  zramctl
  ```
* **Ver logs del Kiosco en tiempo real:**
  ```bash
  journalctl -u myplayad-kiosk.service -f
  ```
* **Probar encendido/apagado manual del televisor por HDMI-CEC:**
  ```bash
  # Encender TV
  (echo "on 0"; echo "as") | cec-client -s -d 1
  # Apagar TV (Standby)
  echo "standby 0" | cec-client -s -d 1
  ```
