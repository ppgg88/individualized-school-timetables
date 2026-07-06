#!/usr/bin/env bash
# Purge RGPD : supprime les rendez-vous, suivis, élèves et formateurs dont la durée de
# conservation (10 ans par défaut) est dépassée. Une sauvegarde est prise avant toute suppression.
# Usage : ./scripts/purge-old-data.sh [--dry-run] [nombre_annees]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE="docker compose -f $ROOT_DIR/docker-compose.prod.yml"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

DRY_RUN=""
RETENTION_YEARS="10"
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN="--dry-run"
  else
    RETENTION_YEARS="$arg"
  fi
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Erreur:${NC} fichier .env introuvable ($ENV_FILE)."
  exit 1
fi

if [[ -z "$DRY_RUN" ]]; then
  echo -e "${BLUE}Sauvegarde de sécurité avant purge...${NC}"
  "$ROOT_DIR/scripts/backup-db.sh" >/dev/null
fi

echo -e "${BLUE}Purge des données de plus de ${RETENTION_YEARS} ans${DRY_RUN:+ (dry-run)}...${NC}"
$COMPOSE exec -T -e RETENTION_YEARS="$RETENTION_YEARS" backend node dist/scripts/purgeOldData.js $DRY_RUN

echo -e "${GREEN}✅ Purge terminée.${NC}"
