#!/bin/bash
set -e

# Directorio base del software de la pantalla
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_FILE="${SCRIPT_DIR}/update.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "[UPDATER] $(date '+%Y-%m-%d %H:%M:%S') - Verificando actualizaciones de producción..."
echo "=========================================="

# 1. Comprobar salida a internet (timeout rápido de 4s para no demorar arranque en modo offline)
if ! curl -s --max-time 4 https://github.com > /dev/null 2>&1; then
    echo "[UPDATER] [OFFLINE] Sin conexión a internet o GitHub no responde. Continuando con software local..."
    exit 0
fi

# 2. Verificar que existe repositorio Git
if [ ! -d ".git" ] && ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[UPDATER] [AVISO] No se detectó repositorio Git en $SCRIPT_DIR. Omitiendo actualización."
    exit 0
fi

# 3. Descargar silenciosamente referencias remotas de la rama de producción ('main')
echo "[UPDATER] Consultando rama origin/main..."
if ! git fetch origin main --quiet; then
    echo "[UPDATER] [WARN] No se pudo conectar con origin/main en este momento. Continuando..."
    exit 0
fi

LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null || echo "unknown")

if [ "$LOCAL_HASH" != "$REMOTE_HASH" ] && [ "$REMOTE_HASH" != "unknown" ]; then
    echo "[UPDATER] ¡Nueva versión de producción disponible!"
    echo "[UPDATER] Commit actual: $LOCAL_HASH -> Nuevo commit: $REMOTE_HASH"

    # Actualizar limpiamente a la versión de producción sin tocar archivos de videos locales
    git reset --hard origin/main

    # Si package.json cambió, instalar dependencias de producción
    if git diff --name-only "$LOCAL_HASH" "$REMOTE_HASH" 2>/dev/null | grep -q "package.json"; then
        echo "[UPDATER] package.json modificado. Actualizando dependencias npm..."
        npm install --omit=dev --no-audit --no-fund
    fi

    echo "[UPDATER] [EXITO] Pantalla actualizada con éxito al commit $REMOTE_HASH."
    echo "STATUS:UPDATED:$REMOTE_HASH"
    exit 0
else
    echo "[UPDATER] [AL DÍA] El sistema ya está en la versión más reciente ($LOCAL_HASH)."
    echo "STATUS:UP_TO_DATE:$LOCAL_HASH"
    exit 0
fi
