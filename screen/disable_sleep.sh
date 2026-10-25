#!/bin/bash
# ==============================================================================
# MyPlayAd - Desactivar reposo, suspensión y salvapantallas en Raspberry Pi 5
# ==============================================================================
# Este script asegura que la Raspberry Pi y su pantalla NUNCA se apaguen ni
# se suspendan por inactividad del sistema operativo, respondiendo ÚNICAMENTE a
# los comandos de encendido y apagado enviados de forma remota desde el Portal.
# ==============================================================================

set -e

echo "=========================================================="
echo "   MyPlayAd - Desactivando Reposo y Blanking en RPi 5"
echo "=========================================================="

TARGET_USER="${SUDO_USER:-$USER}"
TARGET_HOME=$(getent passwd "$TARGET_USER" 2>/dev/null | cut -d: -f6)
TARGET_HOME="${TARGET_HOME:-$HOME}"

# 1. Desactivar salvapantallas del Kernel de Linux (consoleblank=0)
CMDLINE="/boot/firmware/cmdline.txt"
if [ ! -f "$CMDLINE" ] && [ -f "/boot/cmdline.txt" ]; then
    CMDLINE="/boot/cmdline.txt"
fi

if [ -f "$CMDLINE" ]; then
    echo "[1/6] Configurando consoleblank=0 en $CMDLINE..."
    if grep -q "consoleblank=" "$CMDLINE"; then
        sudo sed -i 's/consoleblank=[0-9]*/consoleblank=0/' "$CMDLINE"
    else
        sudo sed -i 's/$/ consoleblank=0/' "$CMDLINE"
    fi
    echo "      ✓ Salvapantallas del Kernel desactivado (consoleblank=0)."
else
    echo "[1/6] ⚠️ No se encontró cmdline.txt en las rutas estándar."
fi

# 2. Desactivar Screen Blanking de Raspberry Pi OS vía raspi-config
echo "[2/6] Desactivando Screen Blanking en Raspberry Pi OS..."
if command -v raspi-config >/dev/null 2>&1; then
    sudo raspi-config nonint do_blanking 1 2>/dev/null || true
    echo "      ✓ Screen Blanking desactivado vía raspi-config."
fi

# 3. Eliminar swayidle de configuraciones de autostart
echo "[3/6] Eliminando procesos y configuraciones de swayidle..."
killall swayidle 2>/dev/null || true
for f in "$TARGET_HOME/.config/labwc/autostart" /etc/xdg/labwc/autostart /etc/xdg/labwc-greeter/autostart; do
    if [ -f "$f" ]; then
        sudo sed -i '/swayidle/d' "$f" 2>/dev/null || sed -i '/swayidle/d' "$f" 2>/dev/null || true
    fi
done
echo "      ✓ swayidle eliminado de las configuraciones de arranque."

# 4. Enmascarar objetivos de suspensión de systemd
echo "[4/6] Enmascarando targets de suspensión en systemd..."
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target 2>/dev/null || true
echo "      ✓ Targets de suspensión (sleep, suspend, hibernate) enmascarados."

# 5. Configurar systemd-logind para ignorar inactividad
echo "[5/6] Configurando /etc/systemd/logind.conf.d/disable-sleep.conf..."
sudo mkdir -p /etc/systemd/logind.conf.d
cat << 'LOGIND_EOF' | sudo tee /etc/systemd/logind.conf.d/disable-sleep.conf >/dev/null
[Login]
IdleAction=ignore
IdleActionSec=0
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleSuspendKey=ignore
HandleHibernateKey=ignore
LOGIND_EOF
sudo systemctl restart systemd-logind 2>/dev/null || true
echo "      ✓ systemd-logind configurado para ignorar eventos de reposo."

# 6. Desactivar ahorro de energía en la tarjeta Wi-Fi y asegurar video activo
echo "[6/6] Desactivando ahorro de energía Wi-Fi y verificando video..."
if command -v iw >/dev/null 2>&1; then
    sudo iw dev wlan0 set power_save off 2>/dev/null || true
fi
if [ -d "/etc/NetworkManager/conf.d" ]; then
    cat << 'NM_EOF' | sudo tee /etc/NetworkManager/conf.d/default-wifi-powersave-disable.conf >/dev/null
[connection]
wifi.powersave = 2
NM_EOF
    sudo systemctl restart NetworkManager 2>/dev/null || true
fi

# Asegurar que labwc o X11 no apaguen la salida de video
if command -v wlopm >/dev/null 2>&1; then
    wlopm --on '*' 2>/dev/null || true
fi
if command -v xset >/dev/null 2>&1; then
    xset s off 2>/dev/null || true
    xset -dpms 2>/dev/null || true
    xset s noblank 2>/dev/null || true
fi

echo ""
echo "=========================================================="
echo "   ✓ REPOSO AUTOMÁTICO DESACTIVADO EXITOSAMENTE"
echo "   La pantalla SOLO se apagará o encenderá cuando"
echo "   se envíe el comando desde el Portal MyPlayAd."
echo "=========================================================="
