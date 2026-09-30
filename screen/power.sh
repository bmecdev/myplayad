#!/bin/bash
# Script de control de energía y display para pantallas MyPlayAd

ACTION="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[POWER] $(date '+%Y-%m-%d %H:%M:%S') - Ejecutando comando de energia: $ACTION"

if [ "$ACTION" = "off" ] || [ "$ACTION" = "standby" ] || [ "$ACTION" = "POWER_OFF" ]; then
    echo "[POWER] Apagando pantalla / TV..."

    # 1. Comando HDMI-CEC: poner televisor en Standby (si cec-client esta instalado)
    if command -v cec-client >/dev/null 2>&1; then
        echo "standby 0" | cec-client -s -d 1 2>/dev/null || true
    fi

    # 2. Desactivar salida HDMI en Wayland (labwc / wlr-randr)
    if command -v wlr-randr >/dev/null 2>&1; then
        wlr-randr --output HDMI-A-1 --off 2>/dev/null || true
        wlr-randr --output HDMI-A-2 --off 2>/dev/null || true
    fi

    # 3. Control de firmware de display en Raspberry Pi
    if command -v vcgencmd >/dev/null 2>&1; then
        vcgencmd display_power 0 2>/dev/null || true
    fi

    echo "[POWER] Pantalla en modo Standby / Apagada."
    exit 0

elif [ "$ACTION" = "on" ] || [ "$ACTION" = "wake" ] || [ "$ACTION" = "POWER_ON" ]; then
    echo "[POWER] Encendiendo pantalla / TV..."

    # 1. Reactivar salida HDMI en Wayland (labwc / wlr-randr)
    if command -v wlr-randr >/dev/null 2>&1; then
        # Obtener rotacion desde config.txt si existe
        ROTATION="90"
        if [ -f "/boot/firmware/config.txt" ]; then
            PARSED_ROT=$(grep -oP '^SCREEN_ROTATE=\K.*' "/boot/firmware/config.txt" | tr -d '"' | tr -d "'" || true)
            if [ -n "$PARSED_ROT" ]; then
                ROTATION="$PARSED_ROT"
            fi
        fi
        wlr-randr --output HDMI-A-1 --on --transform "$ROTATION" 2>/dev/null || wlr-randr --output HDMI-A-1 --on 2>/dev/null || true
        wlr-randr --output HDMI-A-2 --on --transform "$ROTATION" 2>/dev/null || wlr-randr --output HDMI-A-2 --on 2>/dev/null || true
    fi

    # 2. Control de firmware de display en Raspberry Pi
    if command -v vcgencmd >/dev/null 2>&1; then
        vcgencmd display_power 1 2>/dev/null || true
    fi

    # 3. Comando HDMI-CEC: encender televisor y ponerlo en la entrada HDMI de la Raspberry Pi
    if command -v cec-client >/dev/null 2>&1; then
        echo "on 0" | cec-client -s -d 1 2>/dev/null || true
        sleep 1
        echo "as" | cec-client -s -d 1 2>/dev/null || true
    fi

    echo "[POWER] Pantalla encendida exitosamente."
    exit 0

elif [ "$ACTION" = "reboot" ] || [ "$ACTION" = "REBOOT" ]; then
    echo "[POWER] Reiniciando la Raspberry Pi..."
    sudo reboot 2>/dev/null || reboot 2>/dev/null || true
    exit 0
else
    echo "[POWER] Accion no reconocida: $ACTION. Usa: on, off, reboot."
    exit 1
fi
