#!/usr/bin/env bash
# Sauvegarde la base de données de production dans ./backups/.
# Usage : ./scripts/backup-db.sh [nombre_de_jours_a_conserver]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
BACKUP_DIR="$ROOT_DIR/backups"
KEEP_DAYS="${1:-14}"
COMPOSE="docker compose -f $ROOT_DIR/docker-compose.prod.yml"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Erreur:${NC} fichier .env introuvable ($ENV_FILE)."
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y%m%d-%H%M%S)"
outfile="$BACKUP_DIR/edt-${timestamp}.sql.gz"

echo -e "${BLUE}Sauvegarde de la base '${DB_NAME}'...${NC}"
$COMPOSE exec -T db sh -c "mysqldump -u root -p\"\$MYSQL_ROOT_PASSWORD\" --single-transaction --routines \"$DB_NAME\"" \
  | gzip > "$outfile"

echo -e "${GREEN}✅ Sauvegarde créée :${NC} $outfile ($(du -h "$outfile" | cut -f1))"

if [[ "$KEEP_DAYS" -gt 0 ]]; then
  echo -e "${BLUE}Suppression des sauvegardes de plus de ${KEEP_DAYS} jours...${NC}"
  find "$BACKUP_DIR" -name 'edt-*.sql.gz' -mtime "+${KEEP_DAYS}" -print -delete
fi
