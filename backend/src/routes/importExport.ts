import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Router } from 'express';
import type { PoolConnection } from 'mysql2/promise';
import crypto from 'crypto';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { pool, query } from '../db';
import { requireAdmin } from '../middleware/auth';
import { formatMysqlDateTime, getSchoolYearRange } from '../utils/date';
import { getRdvWithFilters, type RdvFilters } from '../utils/rdv';

const upload = multer({ storage: multer.memoryStorage() });

export const importRouter = Router();
export const exportRouter = Router();

function pick(record: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return undefined;
}

async function findOrCreateEleve(connection: PoolConnection, record: Record<string, string>, importationId: number) {
  const nom = pick(record, ['eleve_nom', 'nom_eleve', 'nom']) ?? 'Inconnu';
  const prenom = pick(record, ['eleve_prenom', 'prenom_eleve', 'prenom']) ?? 'Inconnu';
  const mail = pick(record, ['eleve_mail', 'mail_eleve', 'mail']);
  const classe = pick(record, ['classe', 'groupe']);

  if (mail) {
    const [existing] = await connection.query<RowDataPacket[]>('SELECT id FROM eleves WHERE mail = ? LIMIT 1', [mail]);
    if (existing.length) {
      return Number(existing[0].id);
    }
  }

  const [existingByName] = await connection.query<RowDataPacket[]>('SELECT id FROM eleves WHERE nom = ? AND prenom = ? LIMIT 1', [nom, prenom]);
  if (existingByName.length) {
    return Number(existingByName[0].id);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const [result] = await connection.query<ResultSetHeader>(
    'INSERT INTO eleves (nom, prenom, mail, classe, id_importation, token) VALUES (?, ?, ?, ?, ?, ?)',
    [nom, prenom, mail || null, classe || null, importationId, token],
  );
  return result.insertId;
}

async function findOrCreateProf(connection: PoolConnection, record: Record<string, string>, importationId: number) {
  const nom = pick(record, ['prof_nom', 'nom_prof']);
  const prenom = pick(record, ['prof_prenom', 'prenom_prof']);
  const mail = pick(record, ['prof_mail', 'mail_prof']);

  if (!nom || !prenom) {
    return null;
  }

  if (mail) {
    const [existing] = await connection.query<RowDataPacket[]>('SELECT id FROM proph WHERE mail = ? LIMIT 1', [mail]);
    if (existing.length) {
      return Number(existing[0].id);
    }
  }

  const [existingByName] = await connection.query<RowDataPacket[]>('SELECT id FROM proph WHERE nom = ? AND prenom = ? LIMIT 1', [nom, prenom]);
  if (existingByName.length) {
    return Number(existingByName[0].id);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const [result] = await connection.query<ResultSetHeader>(
    'INSERT INTO proph (nom, prenom, mail, id_importation, token) VALUES (?, ?, ?, ?, ?)',
    [nom, prenom, mail || null, importationId, token],
  );
  return result.insertId;
}

importRouter.get('/history', requireAdmin, async (_req, res) => {
  try {
    const rows = await query<RowDataPacket[]>(
      `SELECT importation.id, importation.nom, importation.date, COUNT(rdv.id) AS rdvCount
       FROM importation
       LEFT JOIN rdv ON rdv.id_importation = importation.id
       GROUP BY importation.id, importation.nom, importation.date
       ORDER BY importation.date DESC, importation.id DESC`,
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer l’historique des imports.', error });
  }
});

importRouter.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier CSV reçu.' });
  }

  const records = parse(req.file.buffer.toString('utf-8'), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  if (!records.length) {
    return res.status(400).json({ message: 'Le fichier CSV est vide.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [importResult] = await connection.query<ResultSetHeader>('INSERT INTO importation (nom) VALUES (?)', [req.file.originalname]);
    const importationId = importResult.insertId;

    let createdAppointments = 0;

    for (const record of records) {
      const eleveId = await findOrCreateEleve(connection, record, importationId);
      const profId = await findOrCreateProf(connection, record, importationId);
      const rawDate = pick(record, ['date', 'rdv_date', 'datetime']);

      if (!rawDate) {
        continue;
      }

      const appointmentDate = new Date(rawDate);
      if (Number.isNaN(appointmentDate.getTime())) {
        continue;
      }

      const nom = pick(record, ['rdv_nom', 'nom_rdv', 'rdv', 'nom']) ?? 'Rendez-vous importé';
      const durre = Number(pick(record, ['durre', 'duree', 'duration']) ?? 60);
      const couleur = pick(record, ['couleur', 'color']) ?? '#DF9FDF';
      const lieu = pick(record, ['lieu', 'salle', 'location']) ?? 'À préciser';
      const abs = Number(pick(record, ['abs', 'absence']) ?? 0);

      await connection.query<ResultSetHeader>(
        'INSERT INTO rdv (nom, date, durre, couleur, id_eleves, id_proph, lieu, id_importation, abs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nom, formatMysqlDateTime(appointmentDate), durre, couleur, eleveId, profId, lieu, importationId, abs],
      );
      createdAppointments += 1;
    }

    await connection.commit();
    res.status(201).json({ message: 'Import terminé.', rows: records.length, appointments: createdAppointments, importationId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Impossible d’importer le CSV.', error });
  } finally {
    connection.release();
  }
});

exportRouter.get('/', requireAdmin, async (req, res) => {
  try {
    const semaine = req.query.semaine ? Number(req.query.semaine) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const anneeScolaire = req.query.anneeScolaire ? Number(req.query.anneeScolaire) : undefined;

    let filters: RdvFilters;
    let filename: string;

    if (anneeScolaire) {
      const { start, end } = getSchoolYearRange(anneeScolaire);
      filters = { dateFrom: start, dateTo: end };
      filename = `edt-annee-${anneeScolaire - 1}-${anneeScolaire}.csv`;
    } else {
      filters = { week: semaine, year };
      filename = `edt-semaine-${semaine ?? 'all'}-${year ?? 'all'}.csv`;
    }

    const rdv = await getRdvWithFilters(filters);

    const header = ['id', 'nom', 'date', 'durre', 'couleur', 'lieu', 'abs', 'eleve_nom', 'eleve_prenom', 'eleve_classe', 'prof_nom', 'prof_prenom'];
    const lines = rdv.map((item) => [
      item.id,
      item.nom,
      item.date,
      item.durre,
      item.couleur,
      item.lieu,
      item.abs,
      item.eleves?.nom ?? '',
      item.eleves?.prenom ?? '',
      item.eleves?.classe ?? '',
      item.prof?.nom ?? '',
      item.prof?.prenom ?? '',
    ]);

    const escapeValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [header, ...lines].map((row) => row.map(escapeValue).join(';')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`\uFEFF${csv}`);
  } catch (error) {
    res.status(500).json({ message: 'Impossible d’exporter le CSV.', error });
  }
});
