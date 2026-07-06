# EDT Individualisation — École de ROVILLE

Application de gestion des emplois du temps pour le dispositif d'individualisation : planification des rendez-vous élèves/formateurs, suivi des absences, import/export CSV et notifications par email.

## Stack technique

- **Backend** : Node.js / TypeScript / Express / MySQL (`backend/`)
- **Frontend** : React / TypeScript / Vite / Tailwind CSS (`frontend/`)
- **Base de données** : MySQL 8 (schéma dans `db/init.sql`)
- **Déploiement** : Docker Compose + reverse proxy Caddy (HTTPS automatique)

## Démarrage rapide (développement)

Prérequis : Docker et Docker Compose.

```bash
./start.sh
```

Ce script copie `.env.example` vers `.env` si besoin, construit et démarre tous les services, puis attend qu'ils soient prêts.

- Application : http://localhost:3000
- API : http://localhost:3001/api
- Emails de test (Mailpit) : http://localhost:8025
- Clé admin par défaut : voir le fichier `.env`

Pour arrêter les services : `docker compose down`.

## Développement sans Docker

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

Une base MySQL locale (ou via `docker compose up db`) et un fichier `.env` basé sur `.env.example` sont nécessaires.

## Structure du projet

```
backend/    API Express (routes élèves, formateurs, rendez-vous, EDT, import/export, mail, suivi)
frontend/   Application React (tableau de bord, EDT, gestion des rendez-vous, administration)
db/         Schéma MySQL initial
scripts/    Sauvegarde, restauration, déploiement, purge des données anciennes
Caddyfile   Reverse proxy HTTPS pour la production
```

## Déploiement en production

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour la procédure complète (configuration DNS, `.env.production.example`, `docker-compose.prod.yml`, scripts de sauvegarde/restauration).
