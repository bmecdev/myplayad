#!/bin/bash
# Script de rotación de pantalla en caliente y permanente (Raspberry Pi 5 / Wayland labwc)
# Uso: bash rotate.sh [PORTRAIT | LANDSCAPE | 90 | 0 | 270 | normal]

TARGET="${1:-PORTRAIT}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$TARGET" in
    LANDSCAPE|landscape|horizontal|HORIZONTAL|0|normal)
        ROT_NAME="LANDSCAPE"
        WLR_TRANSFORM="normal"
        ROT_CONFIG="0"
        KERNEL_ROT="0"
        ;;
    270|inverted|INVERTED)
        ROT_NAME="PORTRAIT_INVERTED"
        WLR_TRANSFORM="270"
        ROT_CONFIG="270"
        KERNEL_ROT="270"
        ;;
    180)
        ROT_NAME="LANDSCAPE_INVERTED"
        WLR_TRANSFORM="180"
        ROT_CONFIG="180"
        KERNEL_ROT="180"
        ;;
    PORTRAIT|portrait|vertical|VERTICAL|90|*)
        ROT_NAME="PORTRAIT"
        WLR_TRANSFORM="90"
        ROT_CONFIG="90"
        KERNEL_ROT="90"
        ;;
esac

echo "========================================================"
echo "[ROTATE] $(date '+%Y-%m-%d %H:%M:%S') - Cambiando orientación a $ROT_NAME"
echo "         Transformación Wayland: $WLR_TRANSFORM | Kernel cmdline: rotate=$KERNEL_ROT | config.txt: $ROT_CONFIG"
echo "========================================================"

# 1. Identificar usuario de la sesión gráfica y socket Wayland
DESKTOP_USER="$SUDO_USER"
[ -z "$DESKTOP_USER" ] && DESKTOP_USER=$(who | awk '{print $1}' | head -n 1)
[ -z "$DESKTOP_USER" ] && DESKTOP_USER=$(ps aux | grep -E '[l]abwc|[w]ayfire' | awk '{print $1}' | head -n 1)
[ -z "$DESKTOP_USER" ] && DESKTOP_USER=$(id -un 1000 2>/dev/null || echo "pi")

DESKTOP_UID=$(id -u "$DESKTOP_USER" 2>/dev/null || echo 1000)
DESKTOP_HOME=$(getent passwd "$DESKTOP_USER" 2>/dev/null | cut -d: -f6)
[ -z "$DESKTOP_HOME" ] && DESKTOP_HOME="/home/$DESKTOP_USER"

# Localizar XDG_RUNTIME_DIR del usuario gráfico
if [ -d "/run/user/$DESKTOP_UID" ]; then
    export XDG_RUNTIME_DIR="/run/user/$DESKTOP_UID"
elif [ -n "$XDG_RUNTIME_DIR" ] && [ -d "$XDG_RUNTIME_DIR" ]; then
    export XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR"
else
    for uid_dir in /run/user/*; do
        if [ -d "$uid_dir" ] && ls "$uid_dir"/wayland-* >/dev/null 2>&1; then
            export XDG_RUNTIME_DIR="$uid_dir"
            break
        fi
    done
fi

# Localizar WAYLAND_DISPLAY activo
if [ -n "$XDG_RUNTIME_DIR" ]; then
    for sock in "$XDG_RUNTIME_DIR"/wayland-*; do
        if [ -S "$sock" ]; then
            export WAYLAND_DISPLAY="$(basename "$sock")"
            break
        fi
    done
fi
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"

echo "[ROTATE] Sesión detectada: Usuario=$DESKTOP_USER (UID=$DESKTOP_UID), XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR, WAYLAND_DISPLAY=$WAYLAND_DISPLAY"

# Función para ejecutar wlr-randr como el usuario dueño de la sesión gráfica (evita bloqueo de permisos en Wayland)
run_wlr_randr() {
    if ! command -v wlr-randr >/dev/null 2>&1; then
        echo "[ROTATE] [AVISO] wlr-randr no está instalado."
        return 1
    fi

    if [ "$(id -u)" -eq 0 ] && [ "$DESKTOP_USER" != "root" ]; then
        sudo -u "$DESKTOP_USER" XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" WAYLAND_DISPLAY="$WAYLAND_DISPLAY" wlr-randr "$@"
    else
        XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" WAYLAND_DISPLAY="$WAYLAND_DISPLAY" wlr-randr "$@"
    fi
}

# 2. Aplicar rotación inmediata en caliente con wlr-randr
echo "[ROTATE] Aplicando rotación en caliente en el compositor Wayland..."
WLR_OUTPUTS=$(run_wlr_randr 2>/dev/null | awk '/^[A-Za-z0-9]/ {print $1}')
ROTATED_ANY=false

if [ -n "$WLR_OUTPUTS" ]; then
    for out in $WLR_OUTPUTS; do
        echo "[ROTATE] Rotando salida detectada $out a $WLR_TRANSFORM..."
        if run_wlr_randr --output "$out" --transform "$WLR_TRANSFORM"; then
            ROTATED_ANY=true
        fi
    done
fi

if [ "$ROTATED_ANY" = "false" ]; then
    echo "[ROTATE] Forzando salidas HDMI estándar HDMI-A-1 y HDMI-A-2..."
    run_wlr_randr --output HDMI-A-1 --transform "$WLR_TRANSFORM" 2>&1 || true
    run_wlr_randr --output HDMI-A-2 --transform "$WLR_TRANSFORM" 2>&1 || true
fi

# 3. Actualizar perfiles de Kanshi para persistencia ante reconexión HDMI
if [ -d "$DESKTOP_HOME" ]; then
    KANSHI_DIR="$DESKTOP_HOME/.config/kanshi"
    mkdir -p "$KANSHI_DIR" 2>/dev/null || true
    cat << KANSHI_EOF > "$KANSHI_DIR/config"
profile hdmi1 {
    output HDMI-A-1 transform $WLR_TRANSFORM
}
profile hdmi2 {
    output HDMI-A-2 transform $WLR_TRANSFORM
}
profile dual {
    output HDMI-A-1 transform $WLR_TRANSFORM
    output HDMI-A-2 transform $WLR_TRANSFORM
}
profile fallback {
    output * transform $WLR_TRANSFORM
}
KANSHI_EOF
    chown -R "$DESKTOP_USER:$DESKTOP_USER" "$KANSHI_DIR" 2>/dev/null || true
    pkill -HUP kanshi 2>/dev/null || true
    echo "[ROTATE] Perfiles de kanshi actualizados en $KANSHI_DIR/config"
fi

# 4. Actualizar parámetro de rotación del Kernel en cmdline.txt (KMS/DRM a nivel de hardware)
CMDLINE_FILE="/boot/firmware/cmdline.txt"
[ ! -f "$CMDLINE_FILE" ] && CMDLINE_FILE="/boot/cmdline.txt"

if [ -f "$CMDLINE_FILE" ]; then
    echo "[ROTATE] Actualizando rotación del Kernel en $CMDLINE_FILE..."
    if grep -q "rotate=" "$CMDLINE_FILE" 2>/dev/null; then
        sudo sed -i "s/rotate=[0-9]*/rotate=$KERNEL_ROT/g" "$CMDLINE_FILE" 2>/dev/null || \
        sed -i "s/rotate=[0-9]*/rotate=$KERNEL_ROT/g" "$CMDLINE_FILE" 2>/dev/null || true
    elif grep -q "video=HDMI-A-1" "$CMDLINE_FILE" 2>/dev/null; then
        sudo sed -i "s/video=HDMI-A-1:[^ ]*/video=HDMI-A-1:1920x1080@60,rotate=$KERNEL_ROT/g" "$CMDLINE_FILE" 2>/dev/null || true
    else
        CMD_TEXT=$(cat "$CMDLINE_FILE" 2>/dev/null | tr -d '\n' | sed 's/[[:space:]]*$//')
        if [ -n "$CMD_TEXT" ]; then
            echo "$CMD_TEXT video=HDMI-A-1:1920x1080@60,rotate=$KERNEL_ROT" | sudo tee "$CMDLINE_FILE" >/dev/null 2>&1 || true
        fi
    fi
    VERIFIED_CMDLINE=$(grep -oP 'rotate=\K[0-9]+' "$CMDLINE_FILE" 2>/dev/null || true)
    echo "[ROTATE] Kernel cmdline verificado: rotate=$VERIFIED_CMDLINE"
fi

# 5. Actualizar SCREEN_ROTATE en config.txt
BOOT_CFG="/boot/firmware/config.txt"
[ ! -f "$BOOT_CFG" ] && BOOT_CFG="/boot/config.txt"

if [ -f "$BOOT_CFG" ]; then
    echo "[ROTATE] Actualizando SCREEN_ROTATE en $BOOT_CFG..."
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
            echo "[ROTATE] [OK] config.txt escrito vía sudo tee."
        elif echo "$NEW_CFG_CONTENT" | tee "$BOOT_CFG" >/dev/null 2>&1; then
            echo "[ROTATE] [OK] config.txt escrito vía tee directo."
        fi
    fi
    VERIFIED_CFG=$(grep -oP '^SCREEN_ROTATE=\K.*' "$BOOT_CFG" 2>/dev/null || true)
    echo "[ROTATE] config.txt verificado: SCREEN_ROTATE=$VERIFIED_CFG"
fi

echo "[ROTATE] ✅ Rotación a $ROT_NAME completada con éxito."
exit 0
