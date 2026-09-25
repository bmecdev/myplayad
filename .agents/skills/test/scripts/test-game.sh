#!/usr/bin/env bash
# test-game.sh
# Asistente de validación y pruebas de minijuegos para el comando /test
# Uso: ./test-game.sh [slug]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"

CURRENT_BRANCH=$(git -C "${REPO_ROOT}" branch --show-current)
SLUG="$1"

if [ -z "$SLUG" ]; then
    if [[ "$CURRENT_BRANCH" =~ ^game/(.+)$ ]]; then
        SLUG="${BASH_REMATCH[1]}"
    else
        echo "❌ Error: Especifica el slug del juego o ejecuta desde una rama 'game/<slug>'."
        echo "Uso: $0 <slug>"
        exit 1
    fi
fi

GAME_DIR="${REPO_ROOT}/games/${SLUG}"

if [ ! -d "${GAME_DIR}" ]; then
    echo "❌ Error: No existe el directorio 'games/${SLUG}'."
    exit 1
fi

echo "========================================================"
echo "🧪 Protocolo de Pruebas MyPlayAd (/test) para: ${SLUG}"
echo "========================================================"
echo "🌿 Rama Git actual: ${CURRENT_BRANCH}"

# 1. Verificación de sintaxis JavaScript
echo ""
echo "🔍 1. Verificando sintaxis JavaScript..."
ERRORS=0
for js in $(find "${GAME_DIR}" -name "*.js" -not -name "*.min.js"); do
    if node -c "$js" 2>/dev/null; then
        echo "   ✅ OK: ${js#"${REPO_ROOT}/"}"
    else
        echo "   ❌ ERROR en: ${js#"${REPO_ROOT}/"}"
        node -c "$js" || true
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $ERRORS -gt 0 ]; then
    echo "❌ Se encontraron $ERRORS errores de sintaxis en el código JavaScript."
    exit 1
fi

# 2. Verificación de metadata
echo ""
echo "📋 2. Verificando metadata y archivos clave..."
if [ -f "${GAME_DIR}/game.json" ]; then
    echo "   ✅ 'game.json' encontrado."
else
    echo "   ⚠️ Advertencia: Falta '${GAME_DIR}/game.json'."
fi

if [ -f "${GAME_DIR}/game/qrcode.min.js" ]; then
    echo "   ✅ QR local offline 'qrcode.min.js' presente."
else
    echo "   ⚠️ Advertencia: Falta '${GAME_DIR}/game/qrcode.min.js'."
fi

# 3. Enlaces de prueba
echo ""
echo "🕹️ 3. ENLACES DE PRUEBA:"
echo "--------------------------------------------------------"
echo "🖥️ Archivo Local (Prueba Teclado Pre-Push):"
echo "   file://${GAME_DIR}/game/index.html"
echo ""
echo "🌐 Entorno Staging (Prueba Móvil tras Push):"
echo "   Pantalla: https://dev.myplayad.com/${SLUG}/"
echo "   Control:  https://dev-controllers.myplayad.com/${SLUG}/"
echo ""
echo "🚀 Entorno Producción (Tras Merge a main):"
echo "   Pantalla: https://myplayad.com/${SLUG}/"
echo "   Control:  https://controllers.myplayad.com/${SLUG}/"
echo "--------------------------------------------------------"
echo ""
echo "💡 Recuerda preguntar siempre al desarrollador:"
echo "   '¿Cómo se siente el juego? ¿Qué corregimos o ajustamos?'"
echo "========================================================"
