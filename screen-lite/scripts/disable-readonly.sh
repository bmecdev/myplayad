#!/bin/bash
# ==============================================================================
# MyPlayAd — Desactivar Modo Solo Lectura (Para Mantenimiento y Actualizaciones)
# ==============================================================================

set -e

if [ "$EUID" -ne 0 ]; then
    echo "❌ Error: Este script debe ejecutarse como root (usa sudo)."
    exit 1
fi

echo "================================================="
echo "  Desactivando Modo Solo Lectura (Mantenimiento)"
echo "================================================="

if command -v raspi-config >/dev/null 2>&1; then
    echo "Deshabilitando OverlayFS..."
    raspi-config nonint disable_overlayfs
    raspi-config nonint disable_bootro
    echo ""
    echo "✅ OverlayFS deshabilitado."
    echo "⚠️  Reinicia la Raspberry Pi para poder escribir permanentemente en la MicroSD: sudo reboot"
else
    echo "⚠️  raspi-config no detectado."
fi
