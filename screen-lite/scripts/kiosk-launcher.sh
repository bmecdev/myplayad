#!/bin/bash
# ==============================================================================
# MyPlayAd — Lanzador de Kiosk Lite para MyPlayAd Hub (Cage + Wayland)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$BASE_DIR")"
SCREEN_DIR="$REPO_ROOT/screen"

# Si no está en el repo raíz, buscar en /home/screen/screen o ~/.
if [ ! -d "$SCREEN_DIR" ]; then
    if [ -d "$HOME/screen" ]; then
        SCREEN_DIR="$HOME/screen"
    elif [ -d "/home/screen/screen" ]; then
        SCREEN_DIR="/home/screen/screen"
    fi
fi

# 1. Leer parámetros de configuración desde config.txt de la MicroSD
CONFIG_FILE="/boot/firmware/config.txt"
if [ ! -f "$CONFIG_FILE" ] && [ -f "/boot/config.txt" ]; then
    CONFIG_FILE="/boot/config.txt"
fi

if [ -f "$CONFIG_FILE" ]; then
    PARSED_ID=$(grep -oP '^SCREEN_ID=\K.*' "$CONFIG_FILE" 2>/dev/null | tr -d '"' | tr -d "'" || true)
    if [ -n "$PARSED_ID" ]; then
        export SCREEN_ID="$PARSED_ID"
    fi

    PARSED_ROT=$(grep -oP '^SCREEN_ROTATE=\K.*' "$CONFIG_FILE" 2>/dev/null | tr -d '"' | tr -d "'" || true)
    if [ -n "$PARSED_ROT" ]; then
        export SCREEN_ROTATE="$PARSED_ROT"
    fi

    PARSED_RES=$(grep -oP '^SCREEN_RESOLUTION=\K.*' "$CONFIG_FILE" 2>/dev/null | tr -d '"' | tr -d "'" || true)
    if [ -n "$PARSED_RES" ]; then
        export SCREEN_RESOLUTION="$PARSED_RES"
    fi

    PARSED_URL=$(grep -oP '^REMOTE_VIDEO_SERVER_URL=\K.*' "$CONFIG_FILE" 2>/dev/null | tr -d '"' | tr -d "'" || true)
    if [ -n "$PARSED_URL" ]; then
        export REMOTE_VIDEO_SERVER_URL="$PARSED_URL"
    fi

    PARSED_ENGINE=$(grep -oP '^BROWSER_ENGINE=\K.*' "$CONFIG_FILE" 2>/dev/null | tr -d '"' | tr -d "'" || true)
    if [ -n "$PARSED_ENGINE" ]; then
        export BROWSER_ENGINE="$PARSED_ENGINE"
    fi
fi

# Valores por defecto
export SCREEN_ID="${SCREEN_ID:-bc502bba-859c-461c-a795-f6e4bf2d4931}"
export SCREEN_ROTATE="${SCREEN_ROTATE:-90}"
export SCREEN_RESOLUTION="${SCREEN_RESOLUTION:-1920x1080}"
export REMOTE_VIDEO_SERVER_URL="${REMOTE_VIDEO_SERVER_URL:-https://videos.myplayad.com}"
export BROWSER_ENGINE="${BROWSER_ENGINE:-chromium}"

echo "================================================="
echo "   Iniciando MyPlayAd Kiosk Lite (1GB+ RAM)"
echo "================================================="
echo "Pantalla ID:      $SCREEN_ID"
echo "Orientación:      $SCREEN_ROTATE"
echo "Resolución:       $SCREEN_RESOLUTION"
echo "Motor Web:        $BROWSER_ENGINE"
echo "Directorio App:   $SCREEN_DIR"
echo "================================================="

# 2. Encender televisor por HDMI-CEC en segundo plano
if command -v cec-client >/dev/null 2>&1; then
    (
        echo "tx 10:04"
        sleep 0.5
        echo "on 0"
        sleep 0.5
        echo "as"
    ) | cec-client -s -d 1 >/dev/null 2>&1 &
fi

# 3. Comprobar e iniciar el servidor Node.js local si no está corriendo
if ! pgrep -f "node.*server.js" >/dev/null 2>&1; then
    echo "Iniciando servidor Node.js local..."
    cd "$SCREEN_DIR"
    node server.js &
fi

# Esperar a que el servidor responda en http://localhost:8090
echo "Esperando respuesta de http://localhost:8090..."
RETRIES=0
while [ $RETRIES -lt 15 ]; do
    if curl -s -m 1 http://localhost:8090 >/dev/null 2>&1; then
        echo "✓ Servidor Node.js activo y respondiendo."
        break
    fi
    sleep 0.5
    RETRIES=$((RETRIES + 1))
done

# 4. Configurar variables de entorno para Wayland y Cage
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
if [ ! -d "$XDG_RUNTIME_DIR" ]; then
    mkdir -p "$XDG_RUNTIME_DIR"
    chmod 700 "$XDG_RUNTIME_DIR"
fi

# Permitir a Wayland iniciar aunque no haya teclado o ratón conectado físicamente
export WLR_LIBINPUT_NO_DEVICES=1
export XKB_DEFAULT_LAYOUT="us"

# Crear directorio de caché temporal en RAM para el navegador
mkdir -p /tmp/cache
chmod 777 /tmp/cache

# 5. Lanzar Cage con el motor de navegador seleccionado
KIOSK_URL="http://localhost:8090"

if [ "$BROWSER_ENGINE" = "cog" ] && command -v cog >/dev/null 2>&1; then
    echo "Lanzando WPE WebKit con Cog bajo Cage..."
    exec cage -s -- cog \
        --platform=wl \
        --bg-color=000000 \
        "$KIOSK_URL"
else
    echo "Lanzando Chromium optimizado para 1GB bajo Cage..."
    # Buscar binario de Chromium disponible
    CHROMIUM_BIN="chromium"
    if ! command -v chromium >/dev/null 2>&1; then
        if command -v chromium-browser >/dev/null 2>&1; then
            CHROMIUM_BIN="chromium-browser"
        fi
    fi

    # Leer flags optimizadas desde archivo o usar valores por defecto
    FLAGS_FILE="$BASE_DIR/config/chromium-flags.conf"
    CUSTOM_FLAGS=""
    if [ -f "$FLAGS_FILE" ]; then
        CUSTOM_FLAGS=$(grep -v '^#' "$FLAGS_FILE" | grep -v '^$' | tr '\n' ' ')
    fi

    # Lanzar Cage en modo quiosco estricto a pantalla completa
    # -s: Oculta automáticamente el cursor del mouse tras inactividad
    exec cage -s -- "$CHROMIUM_BIN" \
        --kiosk \
        --noerrdialogs \
        --disable-infobars \
        --no-first-run \
        --password-store=basic \
        --use-mock-keychain \
        --ozone-platform=wayland \
        --in-process-gpu \
        --renderer-process-limit=2 \
        --disable-dev-shm-usage \
        --memory-pressure-off \
        --enable-gpu-rasterization \
        --enable-zero-copy \
        --disk-cache-dir=/tmp/cache \
        --disk-cache-size=33554432 \
        --autoplay-policy=no-user-gesture-required \
        --disable-features=Translate,LockProfileCookieDatabase \
        $CUSTOM_FLAGS \
        "$KIOSK_URL"
fi
