#!/usr/bin/env bash
# ==============================================================================
# Script de Ejecución Unificada de Pruebas del Portal MyPlayAd (/test-portal)
# Backend (cURL) + Frontend (Playwright)
# ==============================================================================
set -e

# Directorio raíz del proyecto
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
PORTAL_DIR="${PROJECT_ROOT}/portal"

# Parámetros por defecto
MODE="all"
export PORTAL_URL="${PORTAL_URL:-https://dev-portal.myplayad.com}"
export ADMIN_USER="${ADMIN_USER:-admin}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-myplayad123}"

# Parsing de argumentos
while [[ $# -gt 0 ]]; do
  case $1 in
    --backend|-b)
      MODE="backend"
      shift
      ;;
    --frontend|-f)
      MODE="frontend"
      shift
      ;;
    --all|-a)
      MODE="all"
      shift
      ;;
    --target|-t)
      export PORTAL_URL="$2"
      shift 2
      ;;
    *)
      echo "Argumento desconocido: $1"
      echo "Uso: $0 [--all | --backend | --frontend] [--target <url>]"
      exit 1
      ;;
  esac
done

# Colores de salida
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     MYPLAYAD - AGENTE DE PRUEBAS DEL PORTAL (/test-portal)           ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}Objetivo Portal:${NC} ${PORTAL_URL}"
echo -e "${BLUE}Modo Seleccionado:${NC} ${BOLD}${MODE}${NC}"
echo -e "${BLUE}Fecha:${NC}            $(date '+%Y-%m-%d %H:%M:%S')\n"

BACKEND_EXIT=0
FRONTEND_EXIT=0

# ==============================================================================
# 1. EJECUCIÓN DE PRUEBAS DE BACKEND (cURL)
# ==============================================================================
if [ "$MODE" = "all" ] || [ "$MODE" = "backend" ]; then
  echo -e "${BOLD}${BLUE}>>> [1/2] Iniciando pruebas de Backend con cURL...${NC}\n"
  if bash "${PORTAL_DIR}/tests/backend/test-all-backend.sh"; then
    echo -e "${GREEN}✓ Pruebas de Backend finalizadas con éxito.${NC}\n"
    BACKEND_EXIT=0
  else
    echo -e "${RED}✗ Fallaron pruebas en la suite de Backend.${NC}\n"
    BACKEND_EXIT=1
  fi
fi

# ==============================================================================
# 2. EJECUCIÓN DE PRUEBAS DE FRONTEND (PLAYWRIGHT)
# ==============================================================================
if [ "$MODE" = "all" ] || [ "$MODE" = "frontend" ]; then
  echo -e "${BOLD}${BLUE}>>> [2/2] Iniciando pruebas de Frontend con Playwright...${NC}\n"
  cd "${PORTAL_DIR}"
  if npx playwright test; then
    echo -e "${GREEN}✓ Pruebas de Frontend finalizadas con éxito.${NC}\n"
    FRONTEND_EXIT=0
  else
    echo -e "${RED}✗ Fallaron pruebas en la suite de Frontend.${NC}\n"
    FRONTEND_EXIT=1
  fi
fi

# ==============================================================================
# RESUMEN GENERAL
# ==============================================================================
echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                    RESUMEN GENERAL DE RESULTADOS                     ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"

if [ "$MODE" = "all" ] || [ "$MODE" = "backend" ]; then
  if [ "$BACKEND_EXIT" -eq 0 ]; then
    echo -e "  Backend (cURL):        ${GREEN}EXITOSO (0 errores)${NC}"
  else
    echo -e "  Backend (cURL):        ${RED}FALLIDO${NC}"
  fi
fi

if [ "$MODE" = "all" ] || [ "$MODE" = "frontend" ]; then
  if [ "$FRONTEND_EXIT" -eq 0 ]; then
    echo -e "  Frontend (Playwright): ${GREEN}EXITOSO (0 errores)${NC}"
  else
    echo -e "  Frontend (Playwright): ${RED}FALLIDO${NC}"
  fi
fi

if [ "$BACKEND_EXIT" -eq 0 ] && [ "$FRONTEND_EXIT" -eq 0 ]; then
  echo -e "\n${GREEN}${BOLD}🎉 ¡EL PORTAL MYPLAYAD ESTÁ 100% OPERATIVO Y VERIFICADO!${NC}\n"
  exit 0
else
  echo -e "\n${RED}${BOLD}⚠️ SE DETECTARON ERRORES DURANTE LAS PRUEBAS.${NC}\n"
  exit 1
fi
