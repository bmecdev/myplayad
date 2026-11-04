#!/bin/bash
# Script de rotación de pantalla en caliente para Wayland (Raspberry Pi / labwc)
# Uso: bash rotate.sh [PORTRAIT | LANDSCAPE | 90 | 0 | 270 | normal]

TARGET="${1:-PORTRAIT}"

case "$TARGET" in
    LANDSCAPE|landscape|horizontal|HORIZONTAL|0|normal)
        ROT_NAME="LANDSCAPE"
        ROT_WLR="normal"
        ROT_CONFIG="0"
        ;;
    270|inverted|INVERTED)
        ROT_NAME="PORTRAIT_INVERTED"
        ROT_WLR="270"
        ROT_CONFIG="270"
        ;;
    180)
        ROT_NAME="LANDSCAPE_INVERTED"
        ROT_WLR="180"
        ROT_CONFIG="180"
        ;;
    PORTRAIT|portrait|vertical|VERTICAL|90|*)
        ROT_NAME="PORTRAIT"
        ROT_WLR="90"
        ROT_CONFIG="90"
        ;;
esac

echo "[ROTATE] $(date '+%Y-%m-%d %H:%M:%S') - Cambiando orientación a $ROT_NAME (transform $ROT_WLR)..."

# Configurar entorno Wayland si no está exportado (necesario cuando se invoca desde Node.js o demonios)
if [ -z "$XDG_RUNTIME_DIR" ]; then
    USER_ID=$(id -u)
    export XDG_RUNTIME_DIR="/run/user/$USER_ID"
fi
if [ -z "$WAYLAND_DISPLAY" ]; then
    export WAYLAND_DISPLAY="wayland-0"
fi

# 1. Aplicar rotación inmediata en el compositor Wayland con wlr-randr
if command -v wlr-randr >/dev/null 2>&1; then
    echo "[ROTATE] Ejecutando wlr-randr..."
    wlr-randr --output HDMI-A-1 --transform "$ROT_WLR" 2>/dev/null || true
    wlr-randr --output HDMI-A-2 --transform "$ROT_WLR" 2>/dev/null || true
    wlr-randr --output "*" --transform "$ROT_WLR" 2>/dev/null || true
fi

# 2. Actualizar configuración de kanshi para persistencia en sesión Wayland
KANSHI_DIR="$HOME/.config/kanshi"
mkdir -p "$KANSHI_DIR" 2>/dev/null || true
cat << EOF > "$KANSHI_DIR/config" 2>/dev/null || true
profile default {
    output HDMI-A-1 transform $ROT_WLR
    output HDMI-A-2 transform $ROT_WLR
    output * transform $ROT_WLR
}
EOF

# Recargar kanshi si está en ejecución
pkill -HUP kanshi 2>/dev/null || true

# 3. Persistir en /boot/firmware/config.txt para persistir entre reinicios físicos
BOOT_CFG="/boot/firmware/config.txt"
[ ! -f "$BOOT_CFG" ] && BOOT_CFG="/boot/config.txt"

if [ -f "$BOOT_CFG" ]; then
    echo "[ROTATE] Guardando SCREEN_ROTATE=$ROT_CONFIG en $BOOT_CFG..."
    if grep -q '^SCREEN_ROTATE=' "$BOOT_CFG" 2>/dev/null; then
        sudo sed -i "s/^SCREEN_ROTATE=.*/SCREEN_ROTATE=$ROT_CONFIG/" "$BOOT_CFG" 2>/dev/null || \
        sed -i "s/^SCREEN_ROTATE=.*/SCREEN_ROTATE=$ROT_CONFIG/" "$BOOT_CFG" 2>/dev/null || true
    else
        echo "SCREEN_ROTATE=$ROT_CONFIG" | sudo tee -a "$BOOT_CFG" >/dev/null 2>&1 || \
        echo "SCREEN_ROTATE=$ROT_CONFIG" >> "$BOOT_CFG" 2>/dev/null || true
    fi
fi

echo "[ROTATE] Orientación configurada exitosamente: $ROT_NAME"
exit 0
