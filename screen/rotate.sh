#!/bin/bash
# Script de rotación de pantalla en caliente para Wayland (Raspberry Pi 5 / labwc)
# Uso: bash rotate.sh [PORTRAIT | LANDSCAPE | 90 | 0 | 270 | normal]

TARGET="${1:-PORTRAIT}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$TARGET" in
    LANDSCAPE|landscape|horizontal|HORIZONTAL|0|normal)
        ROT_NAME="LANDSCAPE"
        WLR_TRANSFORM="normal"
        ROT_CONFIG="0"
        ;;
    270|inverted|INVERTED)
        ROT_NAME="PORTRAIT_INVERTED"
        WLR_TRANSFORM="270"
        ROT_CONFIG="270"
        ;;
    180)
        ROT_NAME="LANDSCAPE_INVERTED"
        WLR_TRANSFORM="180"
        ROT_CONFIG="180"
        ;;
    PORTRAIT|portrait|vertical|VERTICAL|90|*)
        ROT_NAME="PORTRAIT"
        WLR_TRANSFORM="90"
        ROT_CONFIG="90"
        ;;
esac

echo "[ROTATE] $(date '+%Y-%m-%d %H:%M:%S') - Iniciando cambio de orientación a $ROT_NAME (transform: $WLR_TRANSFORM, config.txt: $ROT_CONFIG)..."

# 1. Detectar runtime y socket de Wayland si no están exportados (necesario cuando se ejecuta desde Node.js o servicios)
if [ -z "$XDG_RUNTIME_DIR" ] || [ ! -d "$XDG_RUNTIME_DIR" ]; then
    for uid_dir in /run/user/*; do
        if [ -d "$uid_dir" ] && ls "$uid_dir"/wayland-* >/dev/null 2>&1; then
            export XDG_RUNTIME_DIR="$uid_dir"
            break
        fi
    done
    if [ -z "$XDG_RUNTIME_DIR" ]; then
        export XDG_RUNTIME_DIR="/run/user/$(id -u)"
    fi
fi

if [ -z "$WAYLAND_DISPLAY" ] || [ ! -e "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ]; then
    for sock in "$XDG_RUNTIME_DIR"/wayland-*; do
        if [ -S "$sock" ]; then
            export WAYLAND_DISPLAY="$(basename "$sock")"
            break
        fi
    done
    export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"
fi

echo "[ROTATE] Entorno Wayland detectado: XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR, WAYLAND_DISPLAY=$WAYLAND_DISPLAY"

# 2. Aplicar rotación inmediata en el compositor Wayland (wlr-randr)
if command -v wlr-randr >/dev/null 2>&1; then
    # Detectar todas las salidas de video conectadas dinámicamente
    DETECTED_OUTPUTS=$(wlr-randr 2>/dev/null | awk '/^[A-Za-z0-9]/ {print $1}')
    if [ -n "$DETECTED_OUTPUTS" ]; then
        for out in $DETECTED_OUTPUTS; do
            echo "[ROTATE] Aplicando transform $WLR_TRANSFORM en salida de video: $out"
            wlr-randr --output "$out" --transform "$WLR_TRANSFORM" 2>&1 || true
        done
    else
        echo "[ROTATE] wlr-randr no listó salidas activas. Intentando salidas predeterminadas HDMI-A-1 y HDMI-A-2..."
        wlr-randr --output HDMI-A-1 --transform "$WLR_TRANSFORM" 2>&1 || true
        wlr-randr --output HDMI-A-2 --transform "$WLR_TRANSFORM" 2>&1 || true
    fi
else
    echo "[ROTATE] [AVISO] wlr-randr no está instalado en el sistema."
fi

# 3. Actualizar configuración persistente de Kanshi en el HOME del usuario gráfico
USER_HOME="$HOME"
if [ "$USER_HOME" = "/root" ] || [ -z "$USER_HOME" ]; then
    if [ -n "$XDG_RUNTIME_DIR" ]; then
        RUN_UID=$(basename "$XDG_RUNTIME_DIR")
        USER_HOME=$(getent passwd "$RUN_UID" 2>/dev/null | cut -d: -f6)
    fi
fi
USER_HOME="${USER_HOME:-$HOME}"

if [ -d "$USER_HOME" ]; then
    KANSHI_DIR="$USER_HOME/.config/kanshi"
    mkdir -p "$KANSHI_DIR" 2>/dev/null || true
    cat << KANSHI_EOF > "$KANSHI_DIR/config" 2>/dev/null || true
profile default {
    output HDMI-A-1 transform $WLR_TRANSFORM
    output HDMI-A-2 transform $WLR_TRANSFORM
    output * transform $WLR_TRANSFORM
}
KANSHI_EOF
    # Notificar a kanshi si está corriendo para que aplique el perfil de inmediato
    pkill -HUP kanshi 2>/dev/null || true
    echo "[ROTATE] Perfil de kanshi actualizado en $KANSHI_DIR/config"
fi

# 4. Persistir SCREEN_ROTATE en config.txt (/boot/firmware/config.txt o /boot/config.txt)
BOOT_CFG="/boot/firmware/config.txt"
[ ! -f "$BOOT_CFG" ] && BOOT_CFG="/boot/config.txt"

if [ -f "$BOOT_CFG" ]; then
    echo "[ROTATE] Escribiendo SCREEN_ROTATE=$ROT_CONFIG en $BOOT_CFG..."

    # Reemplazar o agregar usando awk (sin sed -i para evitar fallos de rename en FAT32)
    NEW_CFG_CONTENT=$(awk -v val="$ROT_CONFIG" '
        BEGIN { replaced = 0 }
        /^#?[ \t]*SCREEN_ROTATE=/ {
            print "SCREEN_ROTATE=" val
            replaced = 1
            next
        }
        { print }
        END {
            if (!replaced) print "SCREEN_ROTATE=" val
        }
    ' "$BOOT_CFG" 2>/dev/null)

    if [ -n "$NEW_CFG_CONTENT" ]; then
        if echo "$NEW_CFG_CONTENT" | sudo tee "$BOOT_CFG" >/dev/null 2>&1; then
            echo "[ROTATE] [EXITO] Escrito correctamente vía sudo tee en $BOOT_CFG"
        elif echo "$NEW_CFG_CONTENT" | tee "$BOOT_CFG" >/dev/null 2>&1; then
            echo "[ROTATE] [EXITO] Escrito correctamente vía tee directo en $BOOT_CFG"
        else
            echo "[ROTATE] [ERROR] No se pudo escribir en $BOOT_CFG por permisos."
        fi
    fi

    # Verificación de contenido en el archivo
    VERIFIED_VAL=$(grep -oP '^SCREEN_ROTATE=\K.*' "$BOOT_CFG" 2>/dev/null || true)
    if [ "$VERIFIED_VAL" = "$ROT_CONFIG" ]; then
        echo "[ROTATE] [CONFIRMADO] $BOOT_CFG contiene exactamente SCREEN_ROTATE=$VERIFIED_VAL"
    else
        echo "[ROTATE] [ADVERTENCIA] Valor en $BOOT_CFG es '$VERIFIED_VAL', se esperaba '$ROT_CONFIG'"
    fi
else
    echo "[ROTATE] [AVISO] No se encontró $BOOT_CFG."
fi

echo "[ROTATE] Proceso de rotación finalizado para $ROT_NAME."
exit 0
