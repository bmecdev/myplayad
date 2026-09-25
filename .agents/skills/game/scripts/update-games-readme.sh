#!/usr/bin/env bash
# update-games-readme.sh
# Wrapper para ejecutar el actualizador del catálogo de juegos en README.md

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "${SCRIPT_DIR}/update-games-readme.py"
