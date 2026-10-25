#!/bin/bash
set -e

echo "================================================="
echo "   Configurando Raspberry Pi 5 Kiosk Mode"
echo "================================================="

# Directorio base del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detectar usuario y su directorio HOME real (útil si se ejecuta con sudo)
TARGET_USER="${SUDO_USER:-$USER}"
TARGET_HOME=$(getent passwd "$TARGET_USER" 2>/dev/null | cut -d: -f6)
TARGET_HOME="${TARGET_HOME:-$HOME}"

echo "Usuario destino: $TARGET_USER ($TARGET_HOME)"
echo "Directorio de trabajo: $SCRIPT_DIR"

# 1. Instalar dependencias del sistema y programas requeridos
echo ""
echo "[1/6] Instalando dependencias del sistema y entorno gráfico..."
sudo apt-get update

sudo apt-get install -y \
    curl \
    wget \
    git \
    swaybg \
    kanshi \
    x11-apps \
    cec-utils \
    ffmpeg \
    wlr-randr \
    chromium \
    || sudo apt-get install -y \
    curl \
    wget \
    git \
    swaybg \
    kanshi \
    x11-apps \
    cec-utils \
    ffmpeg \
    chromium-browser \
    || sudo apt-get install -y \
    curl \
    wget \
    git \
    swaybg \
    kanshi \
    x11-apps \
    cec-utils \
    ffmpeg

# 2. Instalar Node.js y npm si no están presentes
echo ""
echo "[2/6] Verificando e instalando Node.js y npm..."
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "Node.js/npm no detectados. Instalando Node.js 20 LTS vía NodeSource..."
    if curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1; then
        sudo apt-get install -y nodejs
    else
        echo "NodeSource no disponible o sin conexión. Instalando paquetes nativos..."
        sudo apt-get install -y nodejs npm
    fi
fi

NODE_VER=$(node -v 2>/dev/null || echo "No instalado")
NPM_VER=$(npm -v 2>/dev/null || echo "No instalado")
echo "Versión detectada: Node.js $NODE_VER | npm $NPM_VER"

# 3. Instalar dependencias de Node.js del proyecto (npm install)
echo ""
echo "[3/6] Instalando dependencias de Node.js del proyecto (npm install)..."
PACKAGE_DIR=""
if [ -f "$SCRIPT_DIR/package.json" ]; then
    PACKAGE_DIR="$SCRIPT_DIR"
elif [ -f "$TARGET_HOME/screen/package.json" ]; then
    PACKAGE_DIR="$TARGET_HOME/screen"
fi

if [ -n "$PACKAGE_DIR" ]; then
    echo "Instalando paquetes npm en $PACKAGE_DIR..."
    if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
        sudo -u "$SUDO_USER" bash -c "cd '$PACKAGE_DIR' && npm install --omit=dev --no-audit --no-fund"
    else
        (cd "$PACKAGE_DIR" && npm install --omit=dev --no-audit --no-fund)
    fi
    echo "Dependencias npm instaladas exitosamente."
else
    echo "⚠️ Aviso: No se encontró package.json en $SCRIPT_DIR ni en $TARGET_HOME/screen."
fi

# Asegurar permisos de ejecución a los scripts auxiliares
chmod +x "$SCRIPT_DIR/power.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/update.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/disable_sleep.sh" 2>/dev/null || true

# 4. Configurar rotación permanente y desactivar salvapantallas del Kernel (KMS / DRM)
echo ""
echo "[4/7] Configurando parámetros de arranque del Kernel en cmdline.txt..."
CMDLINE_FILE="/boot/firmware/cmdline.txt"
if [ ! -f "$CMDLINE_FILE" ] && [ -f "/boot/cmdline.txt" ]; then
    CMDLINE_FILE="/boot/cmdline.txt"
fi

if [ -f "$CMDLINE_FILE" ]; then
    if ! grep -q "rotate=" "$CMDLINE_FILE"; then
        echo "Añadiendo parámetro de rotación vertical (90 grados) al arranque del kernel..."
        # Añadir al final de la línea única sin romper el formato de cmdline.txt
        sudo sed -i.bak 's/$/ video=HDMI-A-1:1920x1080@60,rotate=90/' "$CMDLINE_FILE"
    else
        echo "Parámetro de rotación ya presente en cmdline.txt."
    fi

    # Desactivar salvapantallas del kernel (consoleblank=0)
    if grep -q "consoleblank=" "$CMDLINE_FILE"; then
        sudo sed -i 's/consoleblank=[0-9]*/consoleblank=0/' "$CMDLINE_FILE"
    else
        sudo sed -i 's/$/ consoleblank=0/' "$CMDLINE_FILE"
    fi
    echo "✓ Salvapantallas del Kernel desactivado permanentemente (consoleblank=0)."
fi

# 5. Desactivar suspensión, reposo del SO y ahorro de energía Wi-Fi
echo ""
echo "[5/7] Desactivando reposo del sistema operativo y ahorro de energía..."
if [ -f "$SCRIPT_DIR/disable_sleep.sh" ]; then
    bash "$SCRIPT_DIR/disable_sleep.sh"
fi

# 6. Configurar puntero de mouse invisible
echo ""
echo "[6/7] Generando puntero de ratón transparente..."
CURSOR_DIR="$TARGET_HOME/.icons/empty/cursors"
mkdir -p "$CURSOR_DIR"
cd "$CURSOR_DIR"

# Generar un PNG transparente desde base64
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" | base64 -d > empty.png

# Archivo de configuración del cursor
echo "24 0 0 empty.png" > empty.cursor

# Generar archivo binario de cursor
if command -v xcursorgen >/dev/null 2>&1; then
    xcursorgen empty.cursor empty

    # Clonar para cubrir todos los estados del ratón
    for c in left_ptr default pointer arrow crosshair text; do
        cp empty $c
    done
fi

# Crear el índice del tema
mkdir -p "$TARGET_HOME/.icons/empty"
cat << 'EOF' > "$TARGET_HOME/.icons/empty/index.theme"
[Icon Theme]
Name=empty
Comment=Empty Cursor Theme
EOF

# Volver al directorio de trabajo
cd "$SCRIPT_DIR"

# 7. Configurar labwc (Entorno y Autostart)
echo ""
echo "[7/7] Configurando compositor Wayland (labwc)..."
mkdir -p "$TARGET_HOME/.config/labwc"

# Environment
cat << 'EOF' > "$TARGET_HOME/.config/labwc/environment"
XKB_DEFAULT_MODEL=pc105
XKB_DEFAULT_LAYOUT=us
XKB_DEFAULT_VARIANT=
XKB_DEFAULT_OPTIONS=
XCURSOR_THEME=empty
XCURSOR_SIZE=24
EOF

# Autostart
cat << 'EOF' > "$TARGET_HOME/.config/labwc/autostart"
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

# 3. Desactivar reposo automático, salvapantallas y suspensión del sistema
killall swayidle 2>/dev/null || true
if command -v wlopm >/dev/null 2>&1; then
    wlopm --on '*' 2>/dev/null || true
fi
if command -v xset >/dev/null 2>&1; then
    xset s off 2>/dev/null || true
    xset -dpms 2>/dev/null || true
    xset s noblank 2>/dev/null || true
fi

# 4. Eliminar barra de tareas e íconos de escritorio (Kiosk Mode Puro)
killall pcmanfm wf-panel-pi lwrespawn 2>/dev/null

SCREEN_APP_DIR="$HOME/screen"

if [ -f "$SCREEN_APP_DIR/logo.png" ]; then
    swaybg -i "$SCREEN_APP_DIR/logo.png" -m center -c "#000000" &
fi

# 5. Auto-actualización al encender (Boot-Time Update de producción)
if [ -f "$SCREEN_APP_DIR/update.sh" ]; then
    echo "[AUTOSTART] Comprobando actualizaciones de produccion en origin/main..."
    bash "$SCREEN_APP_DIR/update.sh" || true
fi

# 6. Iniciar el servidor Node en segundo plano
cd "$SCREEN_APP_DIR"
node server.js >> "$SCREEN_APP_DIR/server.log" 2>&1 &

# 7. Esperar a que el servidor Node responda (hasta 15s) antes de lanzar Chromium
for i in $(seq 1 30); do
    if curl -s http://localhost:8090/api/config >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

# 8. Abrir Chromium en modo kiosco (Wayland nativo, sin sleep, sin throttling)
chromium --ozone-platform=wayland --kiosk --noerrdialogs --disable-infobars --no-first-run --password-store=basic --enable-features=OverlayScrollbar --disable-features=Translate --disable-pinch --overscroll-history-navigation=0 --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --autoplay-policy=no-user-gesture-required http://localhost:8090
EOF

chmod +x "$TARGET_HOME/.config/labwc/autostart"

# Ajustar propietarios de archivos en caso de haberse ejecutado con sudo
if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
    chown -R "$TARGET_USER:$TARGET_USER" "$TARGET_HOME/.icons" "$TARGET_HOME/.config" 2>/dev/null || true
    if [ -n "$PACKAGE_DIR" ]; then
        chown -R "$TARGET_USER:$TARGET_USER" "$PACKAGE_DIR" 2>/dev/null || true
    fi
fi

# 7. Finalización
echo ""
echo "================================================="
echo "   Configuración del Kiosco completada con éxito"
echo "================================================="
echo "Programas y dependencias instalados:"
echo " - Herramientas: curl, wget, git, ffmpeg, cec-utils"
echo " - Entorno Wayland/Kiosco: swaybg, kanshi, wlr-randr, chromium, tema cursor invisible"
echo " - Node.js ($NODE_VER) y npm ($NPM_VER)"
echo " - Dependencias npm del servidor compiladas exitosamente"
echo ""
echo "Paso adicional para nuevas MicroSD:"
echo " -> Asegúrate de configurar SCREEN_ID en /boot/firmware/config.txt si no está definido."
echo ""
echo "Para aplicar los cambios de rotación y entorno gráfico, reinicia la Raspberry Pi:"
echo "   sudo reboot"
