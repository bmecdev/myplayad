#!/bin/bash
# ==============================================================================
# MyPlayAd — Lanzador Kiosk para MyPlayAd Hub
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
SCREEN_DIR="$HOME/screen"

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
fi

# Valores por defecto
export SCREEN_ID="${SCREEN_ID:-516af71a-fa58-468f-af77-dade4d2a940f}"
export SCREEN_ROTATE="${SCREEN_ROTATE:-0}"
export SCREEN_RESOLUTION="${SCREEN_RESOLUTION:-1920x1080}"
export REMOTE_VIDEO_SERVER_URL="${REMOTE_VIDEO_SERVER_URL:-https://videos.myplayad.com}"

# 2. Encender televisor por HDMI-CEC
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
    cd "$SCREEN_DIR"
    node server.js &
fi

# Esperar a que el servidor responda
RETRIES=0
while [ $RETRIES -lt 15 ]; do
    if curl -s -m 1 http://localhost:8090 >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
    RETRIES=$((RETRIES + 1))
done

mkdir -p /tmp/cache
chmod 777 /tmp/cache

KIOSK_URL="http://localhost:8090"
CHROMIUM_BIN="chromium"

FLAGS_FILE="$BASE_DIR/config/chromium-flags.conf"
CUSTOM_FLAGS=""
if [ -f "$FLAGS_FILE" ]; then
    CUSTOM_FLAGS=$(grep -v '^#' "$FLAGS_FILE" | grep -v '^$' | tr '\n' ' ')
fi

# Lanzar Chromium a pantalla completa bajo Labwc
exec "$CHROMIUM_BIN" \
    --start-fullscreen \
    --start-maximized \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --no-first-run \
    --password-store=basic \
    --use-mock-keychain \
    --ozone-platform=wayland \
    --hide-scrollbars \
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
