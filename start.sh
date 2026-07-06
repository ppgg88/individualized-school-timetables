#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
EXAMPLE_FILE="$ROOT_DIR/.env.example"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo -e "${RED}Erreur:${NC} la commande '$1' est introuvable."
    exit 1
  fi
}

check_command docker

if ! docker compose version >/dev/null 2>&1; then
  echo -e "${RED}Erreur:${NC} Docker Compose est introuvable."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  echo -e "${YELLOW}Info:${NC} fichier .env créé depuis .env.example"
fi

echo -e "${BLUE}Démarrage des services Docker...${NC}"
(cd "$ROOT_DIR" && docker compose up --build -d)

wait_for_service() {
  local service="$1"
  local container_id
  local status

  container_id="$(cd "$ROOT_DIR" && docker compose ps -q "$service")"
  if [[ -z "$container_id" ]]; then
    echo -e "${RED}Erreur:${NC} impossible de récupérer le conteneur pour $service"
    exit 1
  fi

  for _ in {1..60}; do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"
    if [[ "$status" == "healthy" || "$status" == "running" ]]; then
      echo -e "${GREEN}$service prêt (${status})${NC}"
      return 0
    fi
    sleep 2
  done

  echo -e "${RED}Erreur:${NC} délai dépassé pour $service"
  exit 1
}

wait_for_service db
wait_for_service backend
wait_for_service frontend

echo

echo -e "${GREEN}✅ EDT Individualisation est prêt.${NC}"
echo -e "${BLUE}Application :${NC} http://localhost:3000"
echo -e "${BLUE}API :${NC} http://localhost:3001/api"
echo -e "${YELLOW}Clé admin par défaut :${NC} consulter le fichier .env"
