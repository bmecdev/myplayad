#!/usr/bin/env bash
# ==============================================================================
# Pruebas Unitarias/Integración de Backend: Pantallas y Control de Energía (cURL)
# ==============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common.sh"

log_header "Pruebas de Backend: Pantallas y Control Remoto (/api/screens/*)"

# Iniciar sesión como Super Admin
login_superadmin

# 1. Obtener lista completa de pantallas
log_info "1. Consultando todas las pantallas registradas..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" "${PORTAL_URL}/api/screens")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Listado de pantallas retorna HTTP 200" 200 "$CODE"
assert_contains "Estructura de respuesta es array JSON" "$BODY" "["
assert_contains "Campo displayState presente" "$BODY" "displayState"

# 2. Filtrado por cliente: Pantallas sin asignar (UNASSIGNED)
log_info "2. Probando filtro de pantallas sin asignar (?userId=UNASSIGNED)..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" "${PORTAL_URL}/api/screens?userId=UNASSIGNED")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Filtro UNASSIGNED retorna HTTP 200" 200 "$CODE"
assert_contains "Retorna pantallas sin cliente asignado" "$BODY" '"userId":null'

# 3. Control de energía masivo: Encender todas (POWER_ON)
log_info "3. Ejecutando acción masiva: POWER_ON..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" -X POST "${PORTAL_URL}/api/screens/power-all" \
  -H "Content-Type: application/json" \
  -d '{"action":"POWER_ON"}')
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Acción POWER_ON retorna HTTP 200" 200 "$CODE"
assert_contains "Operación exitosa" "$BODY" '"success":true'
assert_contains "Acción POWER_ON confirmada" "$BODY" '"action":"POWER_ON"'
assert_contains "Conteo de pantallas afectadas reportado" "$BODY" '"count":'

# 4. Control de energía masivo: Apagar / reposo todas (POWER_OFF)
log_info "4. Ejecutando acción masiva: POWER_OFF..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" -X POST "${PORTAL_URL}/api/screens/power-all" \
  -H "Content-Type: application/json" \
  -d '{"action":"POWER_OFF"}')
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Acción POWER_OFF retorna HTTP 200" 200 "$CODE"
assert_contains "Operación exitosa" "$BODY" '"success":true'
assert_contains "Acción POWER_OFF confirmada" "$BODY" '"action":"POWER_OFF"'

# 5. Validación de error ante acción inválida
log_info "5. Verificando validación ante payload inválido en power-all..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" -X POST "${PORTAL_URL}/api/screens/power-all" \
  -H "Content-Type: application/json" \
  -d '{"action":"ACCION_DESCONOCIDA"}')
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Acción inválida debe retornar HTTP 400" 400 "$CODE"
assert_contains "Mensaje de error descriptivo" "$BODY" "Acción inválida"

# 6. Dejar pantallas nuevamente en POWER_ON para operación normal
curl -s -b "$COOKIE_JAR" -X POST "${PORTAL_URL}/api/screens/power-all" \
  -H "Content-Type: application/json" \
  -d '{"action":"POWER_ON"}' > /dev/null

echo -e "\nResultados Pantallas: ${GREEN}${TESTS_PASSED} pasados${NC}, ${RED}${TESTS_FAILED} fallados${NC}"
exit $TESTS_FAILED
