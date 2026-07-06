import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import crypto from 'crypto';
import { query } from './db';
import edtRoutes from './routes/edt';
import elevesRoutes from './routes/eleves';
import { exportRouter, importRouter } from './routes/importExport';
import mailRoutes from './routes/mail';
import profsRoutes from './routes/profs';
import rdvRoutes from './routes/rdv';
import suiviRoutes from './routes/suivi';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const allowedOrigin = process.env.FRONTEND_URL ?? true;

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', error });
  }
});

app.use('/api/eleves', elevesRoutes);
app.use('/api/profs', profsRoutes);
app.use('/api/rdv', rdvRoutes);
app.use('/api/suivi', suiviRoutes);
app.use('/api/edt', edtRoutes);
app.use('/api/import', importRouter);
app.use('/api/export', exportRouter);
app.use('/api/mail', mailRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route introuvable.' });
});

async function migrate() {
  try {
    // Vérifier si la colonne token existe déjà (MySQL 8 ne supporte pas IF NOT EXISTS sur ALTER)
    const cols = await query<any[]>(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proph' AND COLUMN_NAME = 'token'
    `);

    if (!cols.length) {
      await query('ALTER TABLE proph ADD COLUMN token CHAR(64) DEFAULT NULL');
      // Ajouter l'index unique (ignorer l'erreur s'il existe déjà)
      await query('ALTER TABLE proph ADD UNIQUE INDEX uq_proph_token (token)').catch(() => {});
      console.log('Colonne token ajoutée à la table proph.');
    }

    // Générer des tokens pour les profs qui n'en ont pas
    const profs = await query<any[]>('SELECT id FROM proph WHERE token IS NULL');
    for (const prof of profs) {
      const token = crypto.randomBytes(32).toString('hex');
      await query('UPDATE proph SET token = ? WHERE id = ?', [token, prof.id]);
    }
    if (profs.length) console.log(`Tokens générés pour ${profs.length} prof(s).`);
  } catch (err) {
    console.error('Migration tokens profs :', err);
  }

  try {
    // Même migration que ci-dessus, pour la table eleves : chaque élève doit avoir un token
    // unique et secret, utilisé dans le lien/QR code de sa vue EDT personnelle (isole l'accès
    // d'un élève à un autre : connaître l'id ne suffit plus, il faut aussi ce token).
    const cols = await query<any[]>(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eleves' AND COLUMN_NAME = 'token'
    `);

    if (!cols.length) {
      await query('ALTER TABLE eleves ADD COLUMN token CHAR(64) DEFAULT NULL');
      await query('ALTER TABLE eleves ADD UNIQUE INDEX uq_eleves_token (token)').catch(() => {});
      console.log('Colonne token ajoutée à la table eleves.');
    }

    const eleves = await query<any[]>('SELECT id FROM eleves WHERE token IS NULL');
    for (const eleve of eleves) {
      const token = crypto.randomBytes(32).toString('hex');
      await query('UPDATE eleves SET token = ? WHERE id = ?', [token, eleve.id]);
    }
    if (eleves.length) console.log(`Tokens générés pour ${eleves.length} élève(s).`);
  } catch (err) {
    console.error('Migration tokens élèves :', err);
  }

  try {
    await query(`
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
        CONSTRAINT fk_suivi_eleves FOREIGN KEY (id_eleves) REFERENCES eleves (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {
    console.error('Migration table suivi_hebdo :', err);
  }
}

app.listen(port, async () => {
  console.log(`API EDT démarrée sur le port ${port}`);
  await migrate();
});
