#!/usr/bin/env bash
# Déploie (ou met à jour) l'application en production sur ce serveur.
# Usage : ./scripts/deploy.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE="docker compose -f $ROOT_DIR/docker-compose.prod.yml"

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
check_command git

if ! docker compose version >/dev/null 2>&1; then
  echo -e "${RED}Erreur:${NC} Docker Compose est introuvable."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Erreur:${NC} fichier .env manquant."
  echo -e "Copiez .env.production.example vers .env et complétez-le avant de déployer :"
  echo -e "  cp $ROOT_DIR/.env.production.example $ENV_FILE"
  exit 1
fi

# Avertit si des placeholders n'ont pas été remplacés, sans bloquer (au cas où c'est volontaire).
if grep -Eq 'change-me|mon-domaine\.fr|votre-fournisseur' "$ENV_FILE"; then
  echo -e "${YELLOW}Attention:${NC} le fichier .env contient encore des valeurs par défaut (change-me / mon-domaine.fr / …)."
  echo -e "Vérifiez qu'il est bien configuré pour la production avant de continuer."
fi

cd "$ROOT_DIR"

if [[ -d .git ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo -e "${YELLOW}Attention:${NC} modifications locales non commitées détectées, git pull ignoré."
  else
    echo -e "${BLUE}Récupération de la dernière version...${NC}"
    git pull --ff-only
  fi
fi

echo -e "${BLUE}Construction et démarrage des services...${NC}"
$COMPOSE up --build -d

wait_for_service() {
  local service="$1"
  local container_id
  local status

  container_id="$($COMPOSE ps -q "$service")"
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

echo -e "${BLUE}Nettoyage des anciennes images Docker...${NC}"
docker image prune -f >/dev/null

DOMAIN_VALUE="$(grep -E '^DOMAIN=' "$ENV_FILE" | head -1 | cut -d= -f2-)"

echo
echo -e "${GREEN}✅ Déploiement terminé.${NC}"
if [[ -n "$DOMAIN_VALUE" ]]; then
  echo -e "${BLUE}Application :${NC} https://$DOMAIN_VALUE"
fi
