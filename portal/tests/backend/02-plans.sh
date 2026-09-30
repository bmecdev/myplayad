#!/usr/bin/env bash
# ==============================================================================
# Pruebas Unitarias/Integración de Backend: Planes y Cuotas (cURL)
# ==============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common.sh"

log_header "Pruebas de Backend: Planes y Cuotas (/api/plans/*)"

# Iniciar sesión como Super Admin
login_superadmin

# 1. Obtener lista de planes
log_info "1. Consultando catálogo de planes de suscripción..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" "${PORTAL_URL}/api/plans")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Listado de planes retorna HTTP 200" 200 "$CODE"
assert_contains "Respuesta es una lista JSON válida" "$BODY" "["
assert_contains "Contiene Plan Básico" "$BODY" "Plan Básico"
assert_contains "Contiene campo maxVideosPerScreen" "$BODY" "maxVideosPerScreen"

# 2. Validar estructura detallada del primer plan
log_info "2. Validando campos del plan y juegos vinculados..."
assert_contains "Campo slug presente" "$BODY" '"slug":'
assert_contains "Array de juegos presente" "$BODY" '"games":'

echo -e "\nResultados Planes: ${GREEN}${TESTS_PASSED} pasados${NC}, ${RED}${TESTS_FAILED} fallados${NC}"
exit $TESTS_FAILED
