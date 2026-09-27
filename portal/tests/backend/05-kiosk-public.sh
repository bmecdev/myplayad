#!/usr/bin/env bash
# ==============================================================================
# Pruebas Unitarias/Integración de Backend: Endpoints Públicos de Kiosk (cURL)
# ==============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common.sh"

log_header "Pruebas de Backend: Endpoints Públicos Kiosk/Player (/api/public/*)"

# 1. Validar pre-flight OPTIONS con headers CORS
log_info "1. Verificando pre-flight CORS en /api/public/screens/[id]/current..."
RESP=$(curl -s -I -X OPTIONS "${PORTAL_URL}/api/public/screens/demo-screen-id/current")
assert_contains "Cabecera Access-Control-Allow-Origin presente" "$RESP" "access-control-allow-origin: *"
assert_contains "Métodos permitidos incluyen GET, OPTIONS" "$RESP" "GET, OPTIONS"

# 2. Consultar schedule actual de pantalla pública
log_info "2. Consultando video/juego actual para reproductor Kiosk..."
RESP=$(curl -s -w "\n%{http_code}" "${PORTAL_URL}/api/public/screens/demo-screen-id/current")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Consulta pública retorna HTTP 200 sin requerir login" 200 "$CODE"
assert_contains "Estructura JSON con campo type (standby/video/game)" "$BODY" '"type":'
assert_contains "Estructura JSON con lista de próximos eventos (upcoming)" "$BODY" '"upcoming":'

# 3. Validar pre-flight OPTIONS en heartbeat
log_info "3. Verificando pre-flight CORS en /api/public/screens/[id]/heartbeat..."
RESP=$(curl -s -I -X OPTIONS "${PORTAL_URL}/api/public/screens/demo-screen-id/heartbeat")
assert_contains "Heartbeat soporta CORS" "$RESP" "access-control-allow-origin: *"

echo -e "\nResultados Kiosk Público: ${GREEN}${TESTS_PASSED} pasados${NC}, ${RED}${TESTS_FAILED} fallados${NC}"
exit $TESTS_FAILED
