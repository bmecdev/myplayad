#!/usr/bin/env bash
# ==============================================================================
# Pruebas Unitarias/Integración de Backend: Autenticación (cURL)
# ==============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR}/common.sh"

log_header "Pruebas de Backend: Autenticación (/api/auth/*)"

# 1. Login con credenciales erróneas
log_info "1. Validando rechazo de credenciales incorrectas..."
RESP=$(curl -s -w "\n%{http_code}" -X POST "${PORTAL_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"usuario_no_existente","password":"password_erronea"}')
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Login fallido debe retornar HTTP 200/401 con mensaje de error" "$CODE" "$CODE"
assert_contains "Mensaje de credenciales inválidas en JSON" "$BODY" "Credenciales inválidas"

# 2. Login exitoso como Super Admin
log_info "2. Validando login exitoso como Super Admin..."
RESP=$(curl -s -c "$COOKIE_JAR" -w "\n%{http_code}" -X POST "${PORTAL_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASSWORD}\"}")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Login exitoso retorna HTTP 200" 200 "$CODE"
assert_contains "Respuesta de login exitoso" "$BODY" '"success":true'
assert_contains "Rol SUPER_ADMIN asignado" "$BODY" '"role":"SUPER_ADMIN"'

# 3. Consulta de sesión actual (/api/auth/me) con cookie
log_info "3. Validando endpoint /api/auth/me con sesión activa..."
RESP=$(curl -s -b "$COOKIE_JAR" -w "\n%{http_code}" "${PORTAL_URL}/api/auth/me")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Consulta /api/auth/me retorna HTTP 200" 200 "$CODE"
assert_contains "Obtiene username del Super Admin" "$BODY" "\"username\":\"${ADMIN_USER}\""
assert_contains "Obtiene rol SUPER_ADMIN" "$BODY" '"role":"SUPER_ADMIN"'

# 4. Verificación de ruta protegida sin sesión (debe dar 401)
log_info "4. Validando protección de endpoints (/api/screens sin cookie)..."
RESP=$(curl -s -w "\n%{http_code}" "${PORTAL_URL}/api/screens")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Ruta protegida sin auth retorna HTTP 401" 401 "$CODE"
assert_contains "Respuesta de no autorizado" "$BODY" "No autorizado"

# 5. Cierre de sesión (/api/auth/logout)
log_info "5. Validando cierre de sesión (/api/auth/logout)..."
RESP=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w "\n%{http_code}" -X POST "${PORTAL_URL}/api/auth/logout")
BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -n 1)

assert_status "Logout retorna HTTP 200" 200 "$CODE"
assert_contains "Confirmación de logout en JSON" "$BODY" '"success":true'

echo -e "\nResultados Autenticación: ${GREEN}${TESTS_PASSED} pasados${NC}, ${RED}${TESTS_FAILED} fallados${NC}"
exit $TESTS_FAILED
