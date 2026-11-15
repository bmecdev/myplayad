#!/bin/bash
# ==============================================================================
# MyPlayAd — Instalador Automatizado de Kiosk Mode para Raspberry Pi 4 (1GB RAM)
# ==============================================================================
# Diseñado para Raspberry Pi OS Lite (64-bit) basado en Debian Bookworm.
# Pila: Cage (Wayland) + Chromium Optimizado (<350MB) + ZRAM (LZ4) + HDMI-CEC
# ==============================================================================

set -e

if [ "$EUID" -ne 0 ]; then
    echo "❌ Error: Este instalador requiere privilegios de administrador."
    echo "   Por favor ejecútalo con: sudo bash $0"
    exit 1
fi

echo "================================================================="
echo "   🚀 Instalando MyPlayAd Kiosk para Raspberry Pi 4 (1GB RAM)"
echo "================================================================="

# Directorio base del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SCREEN_DIR="$REPO_ROOT/screen"

# Detectar usuario real (útil al ejecutar con sudo)
TARGET_USER="${SUDO_USER:-$USER}"
TARGET_HOME=$(getent passwd "$TARGET_USER" 2>/dev/null | cut -d: -f6)
TARGET_HOME="${TARGET_HOME:-/home/$TARGET_USER}"

echo "👤 Usuario destino:     $TARGET_USER ($TARGET_HOME)"
echo "📁 Directorio RPi4:      $SCRIPT_DIR"
echo "📁 Directorio Screen:    $SCREEN_DIR"
echo ""

# 1. Actualizar repositorios e instalar paquetes base del sistema
echo "[1/8] Instalando dependencias y compositor Wayland (Cage)..."
apt-get update -qq

apt-get install -y \
    curl \
    wget \
    git \
    cage \
    cec-utils \
    zram-tools \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libgles2-mesa \
    libegl1-mesa \
    mesa-utils \
    || apt-get install -y curl wget git cage cec-utils zram-tools

# Intentar instalar Chromium nativo optimizado
if ! command -v chromium >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1; then
    echo "Instalando navegador Chromium..."
    apt-get install -y chromium || apt-get install -y chromium-browser
fi

# Opcional: Intentar instalar Cog y WPE WebKit si están disponibles en los repositorios
apt-get install -y cog wpewebkit-bin 2>/dev/null || true

# 2. Configurar ZRAM Swap (1GB RAM virtual comprimida en RAM con LZ4)
echo ""
echo "[2/8] Configurando ZRAM Swap (Memoria comprimida en RAM)..."
bash "$SCRIPT_DIR/scripts/zram-setup.sh"

# 3. Instalar Node.js 20 LTS si no está presente
echo ""
echo "[3/8] Verificando e instalando Node.js..."
if ! command -v node >/dev/null 2>&1; then
    echo "Instalando Node.js 20 LTS vía NodeSource..."
    if curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1; then
        apt-get install -y nodejs
    else
        echo "NodeSource no disponible, instalando paquete del sistema..."
        apt-get install -y nodejs npm
    fi
fi
echo "✓ Node.js $(node -v) instalado."

# 4. Instalar dependencias npm en la carpeta screen/
echo ""
echo "[4/8] Instalando dependencias de Node.js en screen/..."
if [ -f "$SCREEN_DIR/package.json" ]; then
    sudo -u "$TARGET_USER" bash -c "cd '$SCREEN_DIR' && npm install --omit=dev --no-audit --no-fund"
    echo "✓ Dependencias de Node.js instaladas en $SCREEN_DIR."
elif [ -f "$TARGET_HOME/screen/package.json" ]; then
    sudo -u "$TARGET_USER" bash -c "cd '$TARGET_HOME/screen' && npm install --omit=dev --no-audit --no-fund"
    echo "✓ Dependencias instaladas en $TARGET_HOME/screen."
fi

# 5. Configurar permisos de usuario para hardware gráfico y CEC
echo ""
echo "[5/8] Asignando permisos de hardware a $TARGET_USER..."
for grp in video render input tty dialout; do
    if getent group "$grp" >/dev/null; then
        usermod -aG "$grp" "$TARGET_USER" || true
    fi
done

# Permisos de udev para el adaptador CEC sin requerir root
cat << 'EOF' > /etc/udev/rules.d/99-cec.rules
KERNEL=="cec[0-9]*", GROUP="video", MODE="0660"
SUBSYSTEM=="cec", GROUP="video", MODE="0660"
EOF

# 6. Configurar flags de Chromium en el directorio del usuario
echo ""
echo "[6/8] Configurando flags de Chromium en el perfil del usuario..."
mkdir -p "$TARGET_HOME/.config"
cp "$SCRIPT_DIR/config/chromium-flags.conf" "$TARGET_HOME/.config/chromium-flags.conf"
chown -R "$TARGET_USER:$TARGET_USER" "$TARGET_HOME/.config"

# 7. Configurar firmware (/boot/firmware/config.txt) y kernel (/boot/firmware/cmdline.txt)
echo ""
echo "[7/8] Optimizando parámetros de arranque en MicroSD..."
CONFIG_FILE="/boot/firmware/config.txt"
if [ ! -f "$CONFIG_FILE" ] && [ -f "/boot/config.txt" ]; then
    CONFIG_FILE="/boot/config.txt"
fi

if [ -f "$CONFIG_FILE" ]; then
    # Verificar si ya tiene configuración MyPlayAd
    if ! grep -q "MyPlayAd Config" "$CONFIG_FILE" && ! grep -q "SCREEN_ID=" "$CONFIG_FILE"; then
        echo "Añadiendo parámetros MyPlayAd a $CONFIG_FILE..."
        cat << 'EOF' >> "$CONFIG_FILE"

# ==========================================
# MyPlayAd Config (RPi 4 - 1GB RAM)
# ==========================================
SCREEN_ID=bc502bba-859c-461c-a795-f6e4bf2d4931
SCREEN_ROTATE=90
SCREEN_RESOLUTION=1920x1080
REMOTE_VIDEO_SERVER_URL=https://videos.myplayad.com
BROWSER_ENGINE=chromium

# HDMI-CEC TV Auto Power On
hdmi_force_hotplug=1
hdmi_force_hotplug:0=1
cec_osd_name=MyPlayAd
hdmi_drive=2

# Aceleración GPU y Memoria CMA balanceada para 1GB RAM
dtoverlay=vc4-kms-v3d,cma-128
max_framebuffers=2
disable_splash=1
boot_delay=0
EOF
    fi
    echo "✓ Archivo $CONFIG_FILE configurado."
fi

CMDLINE_FILE="/boot/firmware/cmdline.txt"
if [ ! -f "$CMDLINE_FILE" ] && [ -f "/boot/cmdline.txt" ]; then
    CMDLINE_FILE="/boot/cmdline.txt"
fi

if [ -f "$CMDLINE_FILE" ]; then
    # Desactivar cursor y logos de arranque si no están configurados
    if ! grep -q "consoleblank=0" "$CMDLINE_FILE"; then
        sed -i.bak 's/$/ consoleblank=0 logo.nologo vt.global_cursor_default=0 quiet/' "$CMDLINE_FILE"
    fi
    # Añadir rotación a nivel de kernel si no existe
    if ! grep -q "video=HDMI" "$CMDLINE_FILE"; then
        sed -i 's/$/ video=HDMI-A-1:1920x1080@60,rotate=90/' "$CMDLINE_FILE"
    fi
    echo "✓ Archivo $CMDLINE_FILE optimizado."
fi

# 8. Instalar y habilitar servicios systemd
echo ""
echo "[8/8] Instalando servicios de arranque automático (systemd)..."
chmod +x "$SCRIPT_DIR/scripts/"*.sh

# Servicio HDMI-CEC inmediato
cp "$SCRIPT_DIR/systemd/myplayad-cec-boot.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable myplayad-cec-boot.service

# Ajustar rutas en myplayad-kiosk.service
LAUNCHER_PATH="$SCRIPT_DIR/scripts/kiosk-launcher.sh"
cat << EOF > /etc/systemd/system/myplayad-kiosk.service
[Unit]
Description=MyPlayAd Kiosk Service (Cage Wayland)
After=network-online.target time-sync.target zramswap.service
Wants=network-online.target time-sync.target

[Service]
Type=simple
User=$TARGET_USER
Group=$TARGET_USER
PAMName=login
TTYPath=/dev/tty1
StandardInput=tty
StandardOutput=journal
StandardError=journal
Environment=WLR_LIBINPUT_NO_DEVICES=1
Environment=XDG_RUNTIME_DIR=/run/user/$(id -u "$TARGET_USER")
ExecStart=/bin/bash $LAUNCHER_PATH
Restart=always
RestartSec=3
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable myplayad-kiosk.service

echo ""
echo "================================================================="
echo "   🎉 ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!                     "
echo "================================================================="
echo "La Raspberry Pi 4 de 1GB está lista para operar en modo Kiosco."
echo ""
echo "📌 Resumen de optimizaciones aplicadas:"
echo "   1. Compositor Wayland ultraligero Cage (~18MB RAM)."
echo "   2. ZRAM Swap LZ4 configurado (Virtualiza ~1.6GB de RAM total)."
echo "   3. Flags de Chromium de baja huella de memoria (<350MB RAM)."
echo "   4. Encendido automático de televisor por HDMI-CEC."
echo "   5. Rotación de pantalla permanente vía Kernel KMS."
echo ""
echo "🛡️  PROTECCIÓN ANTI-CORTES DE ENERGÍA (Opcional recomendado):"
echo "   Para blindar la tarjeta MicroSD contra apagones accidentales,"
echo "   ejecuta una vez probado el sistema:"
echo "   👉 sudo bash $SCRIPT_DIR/scripts/enable-readonly.sh"
echo ""
echo "Para arrancar el sistema ahora:"
echo "   👉 sudo reboot"
echo "================================================================="
