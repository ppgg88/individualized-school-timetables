#!/usr/bin/env bash
# Restaure une sauvegarde dans la base de données de production. DESTRUCTIF :
# écrase les données actuelles. Usage : ./scripts/restore-db.sh chemin/vers/edt-XXXX.sql.gz
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE="docker compose -f $ROOT_DIR/docker-compose.prod.yml"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  echo -e "${RED}Erreur:${NC} indiquez le chemin du fichier de sauvegarde (.sql ou .sql.gz)."
  echo "Usage : $0 backups/edt-20260704-120000.sql.gz"
  exit 1
fi
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo -e "${RED}Erreur:${NC} fichier introuvable : $BACKUP_FILE"
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Erreur:${NC} fichier .env introuvable ($ENV_FILE)."
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

echo -e "${YELLOW}⚠️  Ceci va ÉCRASER toutes les données actuelles de la base '${DB_NAME}'.${NC}"
read -r -p "Tapez 'restaurer' pour confirmer : " confirmation
if [[ "$confirmation" != "restaurer" ]]; then
  echo "Annulé."
  exit 1
fi

echo -e "${BLUE}Restauration depuis ${BACKUP_FILE}...${NC}"
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | $COMPOSE exec -T db sh -c "mysql -u root -p\"\$MYSQL_ROOT_PASSWORD\" \"$DB_NAME\""
else
  $COMPOSE exec -T db sh -c "mysql -u root -p\"\$MYSQL_ROOT_PASSWORD\" \"$DB_NAME\"" < "$BACKUP_FILE"
fi

echo -e "${GREEN}✅ Restauration terminée.${NC}"
