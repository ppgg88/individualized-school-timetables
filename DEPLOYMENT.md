# Déploiement en production (serveur OVH)

Ce guide décrit le déploiement de l'application sur un serveur OVH (VPS ou serveur dédié,
Ubuntu/Debian) à l'aide de Docker Compose et de Caddy (reverse proxy + HTTPS automatique
via Let's Encrypt).

## 1. Prérequis

- Un serveur OVH avec un accès SSH root (ou sudo).
- Un nom de domaine dont l'enregistrement DNS **A** (et **AAAA** si IPv6) pointe déjà vers
  l'IP publique du serveur. Sans DNS valide, Caddy ne pourra pas obtenir de certificat HTTPS.
- Les ports **80** et **443** ouverts sur le pare-feu du serveur (et dans l'interface OVH si un
  pare-feu réseau y est configuré).

### Installer Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
# Se reconnecter (ou `newgrp docker`) pour que le groupe prenne effet.
```

Vérifiez : `docker compose version` doit afficher une version (le plugin Compose est inclus).

## 2. Récupérer le projet

```bash
git clone <url-du-dépôt> edt-indiv-v2
cd edt-indiv-v2
```

## 3. Configurer l'environnement

```bash
cp .env.production.example .env
nano .env   # ou vim/vi
```

Remplissez au minimum :

- `DOMAIN` : le nom de domaine pointant vers ce serveur (ex. `edt.mon-lycee.fr`).
- `ACME_EMAIL` : votre email, pour les alertes Let's Encrypt.
- `FRONTEND_URL` : `https://` + le même domaine.
- `DB_PASSWORD` / `DB_ROOT_PASSWORD` : mots de passe forts et uniques
  (`openssl rand -base64 32`).
- `ADMIN_KEY` / `VS_KEY` : clés d'accès de l'application
  (`openssl rand -hex 32`).
- `SMTP_*` : les identifiants de votre fournisseur SMTP réel (aucun serveur de test
  n'est inclus en production, contrairement au `docker-compose.yml` de développement qui
  utilise Mailpit).

**Ne committez jamais ce fichier `.env`** (il est déjà ignoré par git si `.gitignore` le prévoit).

## 4. Déployer

```bash
./scripts/deploy.sh
```

Ce script :
1. Vérifie que Docker et le fichier `.env` sont prêts.
2. Récupère la dernière version du code (`git pull`), sauf si des modifications locales
   non commitées existent.
3. Construit les images et démarre les services (`db`, `backend`, `frontend`, `caddy`).
4. Attend que chaque service soit en bonne santé.
5. Nettoie les anciennes images Docker inutilisées.

Au premier démarrage, Caddy demande automatiquement un certificat Let's Encrypt pour
`DOMAIN` — cela peut prendre quelques dizaines de secondes. Suivez les logs si besoin :

```bash
docker compose -f docker-compose.prod.yml logs -f caddy
```

Une fois terminé, l'application est accessible sur `https://<DOMAIN>`.

## 5. Premier accès admin

Ouvrez `https://<DOMAIN>/?key=<ADMIN_KEY>` (la valeur définie dans `.env`) une première fois
depuis votre navigateur : la clé est alors stockée dans le `localStorage` de ce navigateur et
vous n'aurez plus besoin de la ressaisir. Pensez à noter/partager ce lien avec les personnes
autorisées à administrer le panel.

## 6. Mettre à jour l'application

Après avoir commité/poussé vos changements sur le dépôt :

```bash
cd edt-indiv-v2
./scripts/deploy.sh
```

Le script s'occupe du `git pull`, de la reconstruction des images et du redémarrage — sans
interruption de la base de données (le volume `db_data` est conservé entre les déploiements).

## 7. Sauvegardes de la base de données

```bash
./scripts/backup-db.sh          # conserve les sauvegardes des 14 derniers jours par défaut
./scripts/backup-db.sh 30       # ex. conserver 30 jours
```

Les sauvegardes sont écrites (compressées) dans `./backups/`. Pour automatiser une sauvegarde
quotidienne, ajoutez une tâche cron (`crontab -e`) :

```
0 3 * * * cd /chemin/vers/edt-indiv-v2 && ./scripts/backup-db.sh >> /var/log/edt-backup.log 2>&1
```

Pensez à copier régulièrement le contenu de `./backups/` vers un stockage externe
(autre serveur, objet OVH, etc.) — une sauvegarde qui reste uniquement sur le même disque
que la base ne protège pas contre une panne matérielle.

### Restaurer une sauvegarde

```bash
./scripts/restore-db.sh backups/edt-20260704-030000.sql.gz
```

⚠️ Opération destructive : elle écrase les données actuelles de la base. Une confirmation
explicite est demandée avant de continuer.

## 8. Purge RGPD des données anciennes

Conformément au principe de limitation de la conservation du RGPD, un script supprime
automatiquement les données personnelles de plus de 10 ans :

```bash
./scripts/purge-old-data.sh              # purge les données de plus de 10 ans
./scripts/purge-old-data.sh --dry-run    # simulation : affiche ce qui serait supprimé, sans rien supprimer
./scripts/purge-old-data.sh 5            # ex. changer la durée de rétention (5 ans)
```

Ce que le script supprime :
- les rendez-vous (`rdv`) et suivis hebdomadaires (`suivi_hebdo`) dont la date dépasse la durée de rétention ;
- les élèves et formateurs importés il y a plus de 10 ans **et** qui n'ont plus aucun rendez-vous
  ni suivi récent rattaché (un élève encore actif n'est jamais supprimé) ;
- les lots d'import (`importation`) devenus orphelins une fois ce qui précède supprimé.

Une sauvegarde (`backup-db.sh`) est automatiquement prise juste avant la purge (sauf en
`--dry-run`), pour pouvoir restaurer en cas d'erreur.

Pour automatiser la purge (par exemple une fois par mois), ajoutez une tâche cron :

```
0 4 1 * * cd /chemin/vers/edt-indiv-v2 && ./scripts/purge-old-data.sh >> /var/log/edt-purge.log 2>&1
```

## 9. Différences avec l'environnement de développement

| | `docker-compose.yml` (dev) | `docker-compose.prod.yml` (production) |
|---|---|---|
| Accès | `http://localhost:3000` (port publié) | `https://<DOMAIN>` via Caddy |
| Base de données | port 3306 publié sur l'hôte | non publié (réseau interne uniquement) |
| Backend | port 3001 publié sur l'hôte | non publié (réseau interne uniquement) |
| Emails | Mailpit (faux SMTP, capture les emails) | SMTP réel configuré dans `.env` |
| HTTPS | aucun | automatique via Caddy / Let's Encrypt |

## 10. Dépannage

- **Le certificat HTTPS ne se génère pas** : vérifiez que le DNS pointe bien vers le serveur
  (`dig +short <DOMAIN>`) et que les ports 80/443 sont accessibles depuis l'extérieur.
- **`docker compose ps`** montre un service `unhealthy` : consultez ses logs,
  ex. `docker compose -f docker-compose.prod.yml logs backend`.
- **Emails non envoyés** : vérifiez les identifiants `SMTP_*` dans `.env` et les logs du
  backend ; l'API renvoie une erreur explicite si `SMTP_HOST` est absent.
