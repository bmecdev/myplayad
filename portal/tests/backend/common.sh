#!/usr/bin/env bash
# ==============================================================================
# Helper común para pruebas de backend de MyPlayAd usando cURL
# ==============================================================================

PORTAL_URL="${PORTAL_URL:-https://dev-portal.myplayad.com}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-myplayad123}"

# Colores para la salida
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Contadores de tests
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Cookie jar temporal
COOKIE_JAR=$(mktemp /tmp/myplayad_test_cookies.XXXXXX)

cleanup() {
  rm -f "$COOKIE_JAR" 2>/dev/null || true
}
trap cleanup EXIT

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_header() {
  echo -e "\n${BOLD}${CYAN}=== $1 ===${NC}"
}

assert_status() {
  local test_name="$1"
  local expected_status="$2"
  local actual_status="$3"
  
  TESTS_RUN=$((TESTS_RUN + 1))
  if [ "$expected_status" -eq "$actual_status" ]; then
    echo -e "  ${GREEN}✓ PASS:${NC} $test_name (HTTP $actual_status)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "  ${RED}✗ FAIL:${NC} $test_name (Esperado HTTP $expected_status, Obtenido HTTP $actual_status)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

assert_contains() {
  local test_name="$1"
  local haystack="$2"
  local needle="$3"
  
  TESTS_RUN=$((TESTS_RUN + 1))
  if echo "$haystack" | grep -F -q "$needle"; then
    echo -e "  ${GREEN}✓ PASS:${NC} $test_name (Contiene '$needle')"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "  ${RED}✗ FAIL:${NC} $test_name (No contiene '$needle')"
    echo -e "    ${YELLOW}Respuesta obtenida:${NC} ${haystack:0:200}..."
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

login_superadmin() {
  local response
  response=$(curl -s -c "$COOKIE_JAR" -w "\n%{http_code}" -X POST "${PORTAL_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASSWORD}\"}")
  
  local body
  local code
  body=$(echo "$response" | sed '$d')
  code=$(echo "$response" | tail -n 1)

  if [ "$code" -ne 200 ] || ! echo "$body" | grep -q '"success":true'; then
    echo -e "${RED}[ERROR] No se pudo autenticar como Super Admin en ${PORTAL_URL} (HTTP $code)${NC}"
    echo "$body"
    return 1
  fi
  return 0
}
