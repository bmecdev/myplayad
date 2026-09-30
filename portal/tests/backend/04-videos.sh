#!/usr/bin/env bash
# ==============================================================================
# Pruebas Unitarias/Integración de Backend: Videos y Asignación de Cuotas (cURL)
# ==============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common.sh"

log_header "Pruebas de Backend: Videos y Cuotas (/api/videos/*)"

# Iniciar sesión como Super Admin
login_superadmin

# 1. Obtener lista global de videos
log_info "1. Consultando catálogo de videos en la plataforma..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" "${PORTAL_URL}/api/videos")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Listado de videos retorna HTTP 200" 200 "$CODE"
assert_contains "Estructura de respuesta es array JSON" "$BODY" "["
assert_contains "Propiedad userId presente en el modelo" "$BODY" "userId"
assert_contains "Relación user presente en el payload" "$BODY" '"user":'

# 2. Filtrado de videos por cliente: UNASSIGNED
log_info "2. Probando filtro de videos sin cliente asignado (?userId=UNASSIGNED)..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" "${PORTAL_URL}/api/videos?userId=UNASSIGNED")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Filtro UNASSIGNED de videos retorna HTTP 200" 200 "$CODE"
assert_contains "Solo incluye videos con userId:null" "$BODY" '"userId":null'

# 3. Validar validación de payload en asignación de pantallas (PUT)
log_info "3. Validando validación ante payload inválido en PUT /api/videos/[id]/screens..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" -X PUT "${PORTAL_URL}/api/videos/test-id/screens" \
  -H "Content-Type: application/json" \
  -d '{"screenIds":"formato_invalido_no_array"}')
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Payload inválido (screenIds no array) retorna HTTP 400" 400 "$CODE"
assert_contains "Mensaje descriptivo de error" "$BODY" "Invalid screenIds"

# 4. Validar método no permitido en endpoints de solo lectura o específicos
log_info "4. Validando rechazo a métodos HTTP no soportados..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" -X PATCH "${PORTAL_URL}/api/videos/test-id/screens")
CODE=$(echo "$RESP" | tail -n 1)
assert_status "Método no soportado retorna HTTP 405" 405 "$CODE"

echo -e "\nResultados Videos: ${GREEN}${TESTS_PASSED} pasados${NC}, ${RED}${TESTS_FAILED} fallados${NC}"
exit $TESTS_FAILED
