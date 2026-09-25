#!/usr/bin/env bash
# promote-to-main.sh
# Promueve un juego probado en staging a producción (main) mediante Pull Request
# Uso: ./promote-to-main.sh [slug]

set -e

CURRENT_BRANCH=$(git branch --show-current)
SLUG="$1"

if [ -z "$SLUG" ]; then
    if [[ "$CURRENT_BRANCH" =~ ^game/(.+)$ ]]; then
        SLUG="${BASH_REMATCH[1]}"
    else
        echo "❌ Error: Especifica el slug o ejecuta desde una rama 'game/<slug>'."
        echo "Uso: $0 <slug>"
        exit 1
    fi
fi

BRANCH_NAME="game/${SLUG}"

if [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    echo "🔄 Cambiando a la rama '${BRANCH_NAME}'..."
    git checkout "${BRANCH_NAME}"
fi

# 1. Asegurar que no hay cambios pendientes sin commitear
if ! git diff-index --quiet HEAD --; then
    echo "❌ Hay cambios pendientes sin commitear en '${BRANCH_NAME}'. Haz commit primero."
    exit 1
fi

# 2. Push de la rama a GitHub
echo "⬆️ Pushing '${BRANCH_NAME}' a origin..."
git push origin "${BRANCH_NAME}"

# 3. Crear Pull Request si no existe
echo "📋 Verificando Pull Request..."
PR_URL=$(gh pr list --head "${BRANCH_NAME}" --json url --jq '.[0].url' || true)

if [ -z "$PR_URL" ]; then
    echo "🚀 Creando Pull Request hacia 'main'..."
    PR_URL=$(gh pr create \
        --base main \
        --head "${BRANCH_NAME}" \
        --title "feat(game): agregar minijuego ${SLUG}" \
        --body "### Nuevo Minijuego: ${SLUG}
- Probado en entorno Staging (dev.myplayad.com / dev-controllers.myplayad.com).
- WebRTC P2P con control táctil móvil verificado.
- Despliegue automático a producción al hacer merge.")
    echo "✅ Pull Request creado: ${PR_URL}"
else
    echo "ℹ️ Pull Request existente: ${PR_URL}"
fi

echo ""
echo "🎉 Juego listo para merge a producción."
echo "Para mergear automáticamente ejecuta:"
echo "   gh pr merge ${PR_URL} --merge --delete-branch"
echo "O mergea directamente en GitHub."

