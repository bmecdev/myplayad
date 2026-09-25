#!/usr/bin/env bash
# start-game-branch.sh
# Inicializa de forma segura la rama de desarrollo de un juego en MyPlayAd
# Uso: ./start-game-branch.sh <slug_del_juego>

set -e

SLUG="$1"

if [ -z "$SLUG" ]; then
    echo "❌ Error: Debes especificar el slug del juego."
    echo "Uso: $0 <slug>"
    echo "Ejemplo: $0 pacman"
    exit 1
fi

BRANCH_NAME="game/${SLUG}"

# 1. Verificar si ya estamos en esa rama
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "$BRANCH_NAME" ]; then
    echo "ℹ️ Ya estás en la rama '${BRANCH_NAME}'."
    exit 0
fi

# 2. Verificar estado de cambios sin guardar
if ! git diff-index --quiet HEAD --; then
    echo "⚠️ Tienes cambios locales sin commitear en '${CURRENT_BRANCH}'."
    echo "Haz commit o stash antes de crear una nueva rama de juego."
    exit 1
fi

# 3. Comprobar si la rama local ya existe
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    echo "🔄 Cambiando a la rama existente '${BRANCH_NAME}'..."
    git checkout "${BRANCH_NAME}"
else
    # Sincronizar main antes de ramificar
    echo "⬇️ Actualizando main..."
    git checkout main
    git pull origin main || true
    echo "🌿 Creando y cambiando a la rama '${BRANCH_NAME}'..."
    git checkout -b "${BRANCH_NAME}"
fi

echo "✅ Rama activa: $(git branch --show-current)"
echo "🚀 Todo commit y push desplegará automáticamente en STAGING (/var/www/myplayad-staging/)"
echo "   Pantalla: https://dev.myplayad.com/${SLUG}/"
echo "   Control:  https://dev-controllers.myplayad.com/${SLUG}/"
