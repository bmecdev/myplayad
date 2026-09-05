#!/bin/bash
set -e

echo "================================================="
echo "   Configurando Raspberry Pi 5 Kiosk Mode"
echo "================================================="

# 1. Instalar dependencias
echo "[1/5] Instalando dependencias (swaybg, kanshi, x11-apps, wlr-randr)..."
sudo apt-get update
sudo apt-get install -y swaybg kanshi x11-apps wlr-randr || sudo apt-get install -y swaybg kanshi x11-apps

# 2. Configurar rotación permanente en el Kernel Linux (KMS / DRM)
echo "[2/5] Configurando rotación vertical a nivel de Kernel en /boot/firmware/cmdline.txt..."
CMDLINE_FILE="/boot/firmware/cmdline.txt"
if [ -f "$CMDLINE_FILE" ]; then
    if ! grep -q "rotate=" "$CMDLINE_FILE"; then
        echo "Añadiendo parámetro de rotación vertical (90 grados) al arranque del kernel..."
        # Añadir al final de la línea única sin romper el formato de cmdline.txt
        sudo sed -i.bak 's/$/ video=HDMI-A-1:1920x1080@60,rotate=90/' "$CMDLINE_FILE"
    else
        echo "Parámetro de rotación ya presente en cmdline.txt."
    fi
fi

# 3. Configurar puntero de mouse invisible
echo "[3/5] Generando puntero de ratón transparente..."
mkdir -p ~/.icons/empty/cursors
cd ~/.icons/empty/cursors

# Generar un PNG transparente desde base64
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" | base64 -d > empty.png

# Archivo de configuración del cursor
echo "24 0 0 empty.png" > empty.cursor

# Generar archivo binario de cursor
xcursorgen empty.cursor empty

# Clonar para cubrir todos los estados del ratón
for c in left_ptr default pointer arrow crosshair text; do
    cp empty $c
done

# Crear el índice del tema
mkdir -p ../
cat << 'EOF' > ../index.theme
[Icon Theme]
Name=empty
Comment=Empty Cursor Theme
EOF

# Volver al directorio original
cd - > /dev/null

# 4. Configurar labwc (Entorno y Autostart)
echo "[4/5] Configurando compositor Wayland (labwc)..."
mkdir -p ~/.config/labwc

# Environment
cat << 'EOF' > ~/.config/labwc/environment
XKB_DEFAULT_MODEL=pc105
XKB_DEFAULT_LAYOUT=us
XKB_DEFAULT_VARIANT=
XKB_DEFAULT_OPTIONS=
XCURSOR_THEME=empty
XCURSOR_SIZE=24
EOF

# Autostart
cat << 'EOF' > ~/.config/labwc/autostart
#!/bin/bash

# 1. Leer las variables desde el archivo config.txt de la MicroSD
CONFIG_FILE="/boot/firmware/config.txt"
if [ -f "$CONFIG_FILE" ]; then
    PARSED_ID=$(grep -oP '^SCREEN_ID=\K.*' "$CONFIG_FILE" | tr -d '"' | tr -d "'")
    if [ ! -z "$PARSED_ID" ]; then
        export SCREEN_ID="$PARSED_ID"
    fi
    PARSED_RES=$(grep -oP '^SCREEN_RESOLUTION=\K.*' "$CONFIG_FILE" | tr -d '"' | tr -d "'")
    if [ ! -z "$PARSED_RES" ]; then
        export SCREEN_RESOLUTION="$PARSED_RES"
    fi
    PARSED_ROT=$(grep -oP '^SCREEN_ROTATE=\K.*' "$CONFIG_FILE" | tr -d '"' | tr -d "'")
    if [ ! -z "$PARSED_ROT" ]; then
        export SCREEN_ROTATE="$PARSED_ROT"
    fi
fi

# Variables por defecto por si el archivo config.txt no tiene los valores
export SCREEN_ID="${SCREEN_ID:-bc502bba-859c-461c-a795-f6e4bf2d4931}"
export SCREEN_RESOLUTION="${SCREEN_RESOLUTION:-1920x1080}"
export SCREEN_ROTATE="${SCREEN_ROTATE:-90}"
export REMOTE_VIDEO_SERVER_URL="https://videos.myplayad.com"

# 2. Configurar y lanzar Kanshi (Rotación y Resolución Hotplug-safe)
mkdir -p ~/.config/kanshi
cat << KANSHI_EOF > ~/.config/kanshi/config
profile default {
    output HDMI-A-1 transform ${SCREEN_ROTATE}
    output HDMI-A-2 transform ${SCREEN_ROTATE}
    output * transform ${SCREEN_ROTATE}
}
KANSHI_EOF
kanshi &

# Forzar rotación inicial vía wlr-randr si está disponible
wlr-randr --output HDMI-A-1 --transform ${SCREEN_ROTATE} 2>/dev/null || true
wlr-randr --output HDMI-A-2 --transform ${SCREEN_ROTATE} 2>/dev/null || true

# 3. Eliminar barra de tareas e íconos de escritorio (Kiosk Mode Puro)
killall pcmanfm wf-panel-pi lwrespawn 2>/dev/null
swaybg -i /home/screen/screen/logo.png -m center -c "#000000" &

# 4. Iniciar el servidor Node en segundo plano
cd /home/screen/screen
SCREEN_ID="${SCREEN_ID:-bc502bba-859c-461c-a795-f6e4bf2d4931}" REMOTE_VIDEO_SERVER_URL="https://videos.myplayad.com" node server.js &

# 5. Darle 3 segundos al servidor para que inicie y abrir Chromium en modo kiosco
sleep 3
chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --enable-features=OverlayScrollbar --disable-features=Translate --disable-pinch --overscroll-history-navigation=0 http://localhost:8090
EOF

chmod +x ~/.config/labwc/autostart

# 5. Finalización
echo "[5/5] Configuración completada."
echo "================================================="
echo "Pasos adicionales requeridos en nuevas instalaciones:"
echo "1. Ejecutar npm install en la carpeta /home/screen/screen."
echo "2. Asegurarse que logo.png y el proyecto base estén en /home/screen/screen."
echo "3. Ejecutar 'sudo nano /boot/firmware/config.txt' para agregar el SCREEN_ID y SCREEN_ROTATE=90."
echo ""
echo "Para aplicar los cambios de rotación y gráficos, reinicia la Raspberry Pi: sudo reboot"
