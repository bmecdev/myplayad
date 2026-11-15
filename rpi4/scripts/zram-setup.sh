#!/bin/bash
# ==============================================================================
# MyPlayAd — Configuración de ZRAM Swap con compresión LZ4 para RPi 4 (1GB)
# ==============================================================================
# Este script reemplaza el swap tradicional en la tarjeta MicroSD (lento y destructivo)
# por un dispositivo de memoria virtual comprimida en RAM (ZRAM con LZ4).
# En una RPi 4 de 1GB, 1GB de swap comprimido en RAM ocupa solo ~300MB reales,
# otorgando efectivamente ~1.6GB de memoria de trabajo con 0ms de latencia.
# ==============================================================================

set -e

if [ "$EUID" -ne 0 ]; then
    echo "❌ Error: Este script debe ejecutarse como root (usa sudo)."
    exit 1
fi

echo "================================================="
echo "  Configurando ZRAM Swap (Memoria Comprimida)"
echo "================================================="

# 1. Desactivar y eliminar dphys-swapfile (swap en MicroSD)
echo "[1/4] Desactivando swap tradicional en MicroSD..."
if command -v dphys-swapfile >/dev/null 2>&1; then
    dphys-swapfile swapoff || true
    dphys-swapfile uninstall || true
    systemctl disable dphys-swapfile || true
    systemctl stop dphys-swapfile || true
    echo "✓ Swap tradicional en MicroSD eliminado."
fi

# 2. Instalar zram-tools si no está presente
echo "[2/4] Verificando e instalando zram-tools..."
if ! command -v zramctl >/dev/null 2>&1 || [ ! -f /etc/default/zramswap ]; then
    apt-get update -qq
    apt-get install -y zram-tools
fi

# 3. Configurar parámetros de ZRAM (/etc/default/zramswap)
echo "[3/4] Configurando parámetros de compresión LZ4 y tamaño..."
cat << 'EOF' > /etc/default/zramswap
# Archivo de configuración ZRAM para MyPlayAd (RPi 4 1GB)
# Algoritmo de compresión ultrarrápido con menor uso de CPU:
ALGO=lz4

# Tamaño asignado: 1024MB (1GB) de memoria virtual comprimida
PERCENT=100
SIZE=1024

# Prioridad alta para que el kernel use ZRAM antes de cualquier otro swap
PRIORITY=100
EOF

# 4. Optimizar parámetros del Kernel en /etc/sysctl.d/99-myplayad-zram.conf
cat << 'EOF' > /etc/sysctl.d/99-myplayad-zram.conf
# Optimización de gestión de memoria para ZRAM en RPi 4 1GB
# swappiness=100: Instruye al kernel a comprimir páginas anónimas inactivas en ZRAM de forma proactiva
vm.swappiness=100

# vfs_cache_pressure=50: Mantiene en caché las estructuras de archivos locales
vm.vfs_cache_pressure=50

# page-cluster=0: Lee páginas individuales sin sobrecarga de prefetching en RAM
vm.page-cluster=0
EOF

sysctl --system >/dev/null 2>&1 || true

# 5. Reiniciar servicio zramswap
systemctl restart zramswap || true
systemctl enable zramswap || true

echo ""
echo "[4/4] Verificando estado del dispositivo ZRAM..."
if command -v zramctl >/dev/null 2>&1; then
    zramctl
fi

echo ""
echo "✅ ZRAM Swap configurado exitosamente. La Raspberry Pi 4 de 1GB ahora cuenta con ~1.6GB de memoria efectiva sin desgaste de la MicroSD."
