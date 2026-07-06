CREATE DATABASE IF NOT EXISTS edt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE edt;

CREATE TABLE IF NOT EXISTS importation (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eleves (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  mail VARCHAR(190) DEFAULT NULL,
  classe VARCHAR(120) DEFAULT NULL,
  token CHAR(64) DEFAULT NULL,
  id_importation INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_eleves_token (token),
  KEY idx_eleves_nom (nom, prenom),
  KEY idx_eleves_importation (id_importation),
  CONSTRAINT fk_eleves_importation FOREIGN KEY (id_importation) REFERENCES importation (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proph (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  mail VARCHAR(190) DEFAULT NULL,
  token CHAR(64) DEFAULT NULL,
  id_importation INT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_proph_token (token),
  KEY idx_proph_nom (nom, prenom),
  KEY idx_proph_importation (id_importation),
  CONSTRAINT fk_proph_importation FOREIGN KEY (id_importation) REFERENCES importation (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rdv (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  durre INT UNSIGNED NOT NULL,
  couleur CHAR(7) NOT NULL,
  id_eleves INT UNSIGNED NOT NULL,
  id_proph INT UNSIGNED DEFAULT NULL,
  lieu VARCHAR(255) NOT NULL,
  id_importation INT UNSIGNED DEFAULT NULL,
  abs TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_rdv_date (date),
  KEY idx_rdv_eleves (id_eleves),
  KEY idx_rdv_proph (id_proph),
  KEY idx_rdv_importation (id_importation),
  CONSTRAINT fk_rdv_eleves FOREIGN KEY (id_eleves) REFERENCES eleves (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rdv_proph FOREIGN KEY (id_proph) REFERENCES proph (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_rdv_importation FOREIGN KEY (id_importation) REFERENCES importation (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_rdv_abs CHECK (abs IN (-1, 0, 1, 2, 4)),
  CONSTRAINT chk_rdv_couleur CHECK (couleur REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suivi_hebdo (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_eleves INT UNSIGNED NOT NULL,
  semaine TINYINT UNSIGNED NOT NULL,
  annee SMALLINT UNSIGNED NOT NULL,
  contenu TEXT NOT NULL,
  ressenti TINYINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_suivi_eleve_semaine (id_eleves, semaine, annee),
  KEY idx_suivi_eleve (id_eleves),
  CONSTRAINT fk_suivi_eleves FOREIGN KEY (id_eleves) REFERENCES eleves (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_suivi_semaine CHECK (semaine BETWEEN 1 AND 53),
  CONSTRAINT chk_suivi_ressenti CHECK (ressenti IS NULL OR ressenti IN (1, 2, 3, 4))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO importation (id, nom, date) VALUES
  (1, 'Jeu de demonstration initial', '2026-07-01 08:00:00')
ON DUPLICATE KEY UPDATE nom = VALUES(nom), date = VALUES(date);

INSERT INTO eleves (id, nom, prenom, mail, classe, id_importation) VALUES
  (1, 'Martin', 'Claire', 'claire.martin@roville.fr', 'BTS APV 1', 1),
  (2, 'Dubois', 'Lucas', 'lucas.dubois@roville.fr', 'BTS APV 2', 1),
  (3, 'Bernard', 'Emma', 'emma.bernard@roville.fr', 'Terminale STAV', 1)
ON DUPLICATE KEY UPDATE nom = VALUES(nom), prenom = VALUES(prenom), mail = VALUES(mail), classe = VALUES(classe), id_importation = VALUES(id_importation);

INSERT INTO proph (id, nom, prenom, mail, token, id_importation) VALUES
  (1, 'Morel', 'Julie', 'julie.morel@roville.fr', 'a1f3e2d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2', 1),
  (2, 'Petit', 'Hugo', 'hugo.petit@roville.fr', 'b2e4d3c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3', 1)
ON DUPLICATE KEY UPDATE nom = VALUES(nom), prenom = VALUES(prenom), mail = VALUES(mail), id_importation = VALUES(id_importation);

INSERT INTO rdv (id, nom, date, durre, couleur, id_eleves, id_proph, lieu, id_importation, abs) VALUES
  (1, 'Point hebdomadaire individualisation', '2026-06-29 08:30:00', 60, '#DF9FDF', 1, 1, 'Salle Indigo', 1, 1),
  (2, 'Travaux en serres', '2026-06-30 10:00:00', 90, '#ADFF2F', 2, 2, 'Serre 2', 1, 0),
  (3, 'Accompagnement CDR', '2026-07-01 13:30:00', 45, '#9BD9EE', 3, 1, 'CDR', 1, -1),
  (4, 'Cours prof horticulture', '2026-07-02 09:00:00', 120, '#DBE2D0', 1, 2, 'Salle 4', 1, 1),
  (5, 'Visite Arexhor', '2026-07-03 14:00:00', 60, '#F3E768', 2, 1, 'Parcelle experimentale', 1, 2)
ON DUPLICATE KEY UPDATE nom = VALUES(nom), date = VALUES(date), durre = VALUES(durre), couleur = VALUES(couleur), id_eleves = VALUES(id_eleves), id_proph = VALUES(id_proph), lieu = VALUES(lieu), id_importation = VALUES(id_importation), abs = VALUES(abs);
