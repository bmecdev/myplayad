# Configuración de Kiosk Mode para Cartelería Digital en Raspberry Pi 5 (Bookworm/Wayland)

Este documento detalla todos los pasos y configuraciones implementadas en esta Raspberry Pi 5 para convertirla en un reproductor de cartelería digital autónomo a prueba de fallos. El sistema utiliza **labwc** (el compositor Wayland por defecto en RPi OS Bookworm).

## 1. Rotación y Resolución Permanente de Pantalla (Hotplug-safe)
Para que la pantalla se mantenga en orientación vertical (90 grados) y a una resolución fija (1280x720) incluso si se desconecta y reconecta el cable HDMI, configuramos el demonio `kanshi`.

**Archivo:** `~/.config/kanshi/config`
```text
profile default {
    output * mode 1280x720 transform 90
}
```

## 2. Lectura Automática del SCREEN_ID
Para permitir el cambio de pantalla fácilmente cambiando la memoria MicroSD, añadimos el identificador de la pantalla al final del archivo de hardware base de la Raspberry Pi.

**Archivo:** `/boot/firmware/config.txt`
Se añadió al final:
```text
# MyPlayAd Config
SCREEN_ID=bc502bba-859c-461c-a795-f6e4bf2d4931
```
*El script de arranque usa `grep` para leer este archivo sin ejecutarlo, evitando errores de sintaxis en bash.*

## 3. Fondo de Pantalla Limpio (Sin Iconos ni Barra de Tareas)
Para evitar que se vea el escritorio tradicional de Raspberry Pi y reemplazarlo por un fondo negro con un logotipo:

1. Se instaló `swaybg`: `sudo apt install swaybg`
2. Se colocó el logotipo en `/home/screen/screen/logo.png`.
3. En el script de inicio, se programó la "matanza" de la interfaz por defecto:
   ```bash
   killall pcmanfm wf-panel-pi lwrespawn
   ```
   *(Esto destruye la barra de tareas y el gestor de íconos del escritorio)*.
4. Se ejecuta `swaybg` para dibujar el fondo negro con la imagen centrada.

## 4. Script de Auto-Arranque Maestro
La orquestación de todos estos elementos ocurre automáticamente cada vez que el entorno gráfico inicia, controlando el backend de Node.js y el navegador Chromium.

**Archivo:** `~/.config/labwc/autostart`
```bash
#!/bin/bash

# 1. Rotar la pantalla (vertical) permanentemente usando kanshi
kanshi &

# 2. Leer las variables desde el archivo config.txt de la MicroSD
CONFIG_FILE="/boot/firmware/config.txt"
if [ -f "$CONFIG_FILE" ]; then
    PARSED_ID=$(grep -oP '^SCREEN_ID=\K.*' "$CONFIG_FILE" | tr -d '"' | tr -d "'")
    if [ ! -z "$PARSED_ID" ]; then
        export SCREEN_ID="$PARSED_ID"
    fi
fi

export SCREEN_ID="${SCREEN_ID:-bc502bba-859c-461c-a795-f6e4bf2d4931}"
export REMOTE_VIDEO_SERVER_URL="https://videos.myplayad.com"

# 3. Eliminar barra de tareas e íconos de escritorio (Kiosk Mode Puro)
killall pcmanfm wf-panel-pi lwrespawn 2>/dev/null
swaybg -i /home/screen/screen/logo.png -m center -c "#000000" &

# Ocultamiento del mouse

# 4. Iniciar el servidor Node en segundo plano
cd /home/screen/screen
SCREEN_ID="${SCREEN_ID:-bc502bba-859c-461c-a795-f6e4bf2d4931}" REMOTE_VIDEO_SERVER_URL="https://videos.myplayad.com" node server.js &

# 5. Darle 3 segundos al servidor para que inicie y abrir Chromium en modo kiosco
sleep 3
chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --enable-features=OverlayScrollbar --disable-features=Translate http://localhost:8090
```

## 5. Prevención del Pop-up de Traducción y Puntero Mouse (CSS)
Para evitar que Chromium sugiera traducir el contenido, se modificó el código fuente web:
- **`index.html`**: Se agregó `<html translate="no">` y `<meta name="google" content="notranslate">`.
- **`style.css`**: Se forzó la invisibilidad del cursor sobre elementos web mediante `* { cursor: none !important; }`.

## 6. Ocultamiento Extremo del Ratón
Ya que Wayland y los iFrames complican el ocultamiento del mouse, se implementaron 3 capas de seguridad:
1. **Instalación de dependencias y creación del cursor transparente:**
   Para ocultar físicamente el cursor a nivel de compositor Wayland, creamos un tema de cursor vacío con las siguientes instrucciones en terminal:
   ```bash
   sudo apt-get install -y x11-apps
   mkdir -p ~/.icons/empty/cursors
   cd ~/.icons/empty/cursors
   # Crear un PNG 1x1 transparente desde base64
   echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" | base64 -d > empty.png
   # Archivo de configuración del cursor
   echo "24 0 0 empty.png" > empty.cursor
   # Generar archivo binario de cursor
   xcursorgen empty.cursor empty
   # Copiar para cubrir todos los estados del ratón
   for c in left_ptr default pointer arrow crosshair text; do cp empty $c; done
   # Crear el índice del tema
   mkdir -p ../
   echo -e "[Icon Theme]\nName=empty\nComment=Empty Cursor Theme" > ../index.theme
   ```
2. **Asignación a nivel sistema en labwc:**
   En el archivo de variables de entorno de labwc (`~/.config/labwc/environment`), se añadió:
   ```text
   XCURSOR_THEME=empty
   XCURSOR_SIZE=24
   ```
3. **Refuerzo con CSS:**
   Se aplicó la regla global `* { cursor: none !important; }` en la aplicación web (`style.css`).

---
*Para modificar cualquier configuración, usa SSH o conecta un teclado físico y presiona `Alt+F4` para cerrar el modo kiosco y acceder a la terminal.*

## 7. Solución de Problemas (Troubleshooting)
- **El Kiosko arranca pero la página no carga (Node se cierra):** 
  Si Node.js falla silenciosamente, es posible que la carpeta `node_modules` esté corrupta por una actualización del sistema.
  **Solución:** Conéctate por SSH y reconstruye los paquetes:
  ```bash
  cd /home/screen/screen
  rm -rf node_modules package-lock.json
  npm install
  sudo reboot
  ```
