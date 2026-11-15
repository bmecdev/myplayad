#!/bin/bash
# ==============================================================================
# MyPlayAd — Activar Modo Solo Lectura (OverlayFS Anti-Apagones)
# ==============================================================================
# Activa el sistema de archivos de solo lectura mediante el kernel OverlayFS.
# La tarjeta MicroSD queda protegida al 100% contra cortes abruptos de electricidad.
# ==============================================================================

set -e

if [ "$EUID" -ne 0 ]; then
    echo "❌ Error: Este script debe ejecutarse como root (usa sudo)."
    exit 1
fi

echo "================================================="
echo "  Activando Modo Solo Lectura (OverlayFS)"
echo "================================================="

if command -v raspi-config >/dev/null 2>&1; then
    echo "Habilitando OverlayFS y partición /boot de solo lectura..."
    raspi-config nonint enable_overlayfs
    raspi-config nonint enable_bootro
    echo ""
    echo "✅ OverlayFS habilitado exitosamente."
    echo "⚠️  Para aplicar los cambios definitivos, reinicia la Raspberry Pi con: sudo reboot"
else
    echo "⚠️  raspi-config no detectado. Si estás en Alpine Linux, el modo Diskless ya corre en RAM por defecto."
fi
