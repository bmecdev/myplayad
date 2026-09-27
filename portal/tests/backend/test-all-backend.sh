#!/usr/bin/env bash
# ==============================================================================
# Suite Completa de Pruebas de Backend MyPlayAd (cURL)
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTAL_URL="${PORTAL_URL:-https://dev-portal.myplayad.com}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${BOLD}${CYAN}====================================================================${NC}"
echo -e "${BOLD}${CYAN}   MYPLAYAD - SUITE DE PRUEBAS DE BACKEND (cURL)                  ${NC}"
echo -e "${BOLD}${CYAN}====================================================================${NC}"
echo -e "${BLUE}Objetivo:${NC} ${PORTAL_URL}"
echo -e "${BLUE}Fecha:${NC}    $(date '+%Y-%m-%d %H:%M:%S')\n"

TOTAL_SUITES=0
SUITES_PASSED=0
SUITES_FAILED=0

run_suite() {
  local script_path="$1"
  local suite_name="$2"
  
  TOTAL_SUITES=$((TOTAL_SUITES + 1))
  echo -e "\n${BOLD}Ejecutando módulo: ${suite_name}...${NC}"
  if bash "$script_path"; then
    SUITES_PASSED=$((SUITES_PASSED + 1))
  else
    SUITES_FAILED=$((SUITES_FAILED + 1))
  fi
}

run_suite "${DIR}/01-auth.sh" "01 - Autenticación y Sesiones"
run_suite "${DIR}/02-plans.sh" "02 - Planes y Cuotas"
run_suite "${DIR}/03-screens.sh" "03 - Pantallas y Control Remoto"
run_suite "${DIR}/04-videos.sh" "04 - Videos y Asignaciones"
run_suite "${DIR}/05-kiosk-public.sh" "05 - Endpoints Públicos de Kiosk"

echo -e "\n${BOLD}${CYAN}====================================================================${NC}"
echo -e "${BOLD}${CYAN}   RESUMEN FINAL DE PRUEBAS DE BACKEND (cURL)                     ${NC}"
echo -e "${BOLD}${CYAN}====================================================================${NC}"
echo -e "Total de Módulos: ${TOTAL_SUITES}"
echo -e "Módulos Exitosos: ${GREEN}${SUITES_PASSED}${NC}"
echo -e "Módulos Fallidos: ${RED}${SUITES_FAILED}${NC}"

if [ "$SUITES_FAILED" -eq 0 ]; then
  echo -e "\n${GREEN}${BOLD}✓ ¡TODAS LAS PRUEBAS DE BACKEND PASARON EXITOSAMENTE!${NC}\n"
  exit 0
else
  echo -e "\n${RED}${BOLD}✗ SE ENCONTRARON ERRORES EN EL BACKEND.${NC}\n"
  exit 1
fi
