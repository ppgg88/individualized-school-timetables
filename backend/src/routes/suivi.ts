import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Router } from 'express';
import { query } from '../db';
import { requireAdmin } from '../middleware/auth';
import { formatMysqlDateTime, getIsoWeekRange, getSchoolYearRange, getWeekStart } from '../utils/date';

const router = Router();

const RESSENTI_LABELS: Record<number, string> = {
  1: 'Très bien',
  2: 'Bien',
  3: 'Neutre',
  4: 'Difficile',
};

interface SuiviRow extends RowDataPacket {
  id: number;
  id_eleves: number;
  semaine: number;
  annee: number;
  contenu: string;
  ressenti: number | null;
  updated_at: string;
}

function mapSuivi(row: SuiviRow) {
  return {
    id: row.id,
    id_eleves: row.id_eleves,
    semaine: row.semaine,
    annee: row.annee,
    contenu: row.contenu,
    ressenti: row.ressenti,
    updatedAt: row.updated_at,
  };
}

/** Élèves ayant eu au moins un RDV sur la semaine, avec leur suivi existant s'il y en a un. */
router.get('/semaine', requireAdmin, async (req, res) => {
  const semaine = Number(req.query.semaine);
  const annee = Number(req.query.year);

  if (!semaine || !annee) {
    return res.status(400).json({ message: 'Paramètres semaine et year requis.' });
  }

  try {
    const { start, end } = getIsoWeekRange(semaine, annee);
    const eleves = await query<RowDataPacket[]>(
      `SELECT DISTINCT e.id, e.nom, e.prenom, e.classe
       FROM eleves e
       INNER JOIN rdv r ON r.id_eleves = e.id
       WHERE r.date >= ? AND r.date < ?
       ORDER BY e.nom ASC, e.prenom ASC`,
      [formatMysqlDateTime(start), formatMysqlDateTime(end)],
    );

    const suivis = await query<SuiviRow[]>(
      'SELECT * FROM suivi_hebdo WHERE semaine = ? AND annee = ?',
      [semaine, annee],
    );
    const suivisByEleve = new Map(suivis.map((row) => [row.id_eleves, mapSuivi(row)]));

    res.json(
      eleves.map((eleve) => ({
        id: Number(eleve.id),
        nom: String(eleve.nom),
        prenom: String(eleve.prenom),
        classe: eleve.classe ? String(eleve.classe) : undefined,
        suivi: suivisByEleve.get(Number(eleve.id)) ?? null,
      })),
    );
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer le suivi de la semaine.', error });
  }
});

/** Export CSV de l'historique de suivi (tous les élèves, un seul via id_eleves, et/ou une année scolaire via anneeScolaire). */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const idEleve = req.query.id_eleves ? Number(req.query.id_eleves) : undefined;
    const anneeScolaire = req.query.anneeScolaire ? Number(req.query.anneeScolaire) : undefined;

    const rows = await query<RowDataPacket[]>(
      `SELECT s.semaine, s.annee, s.contenu, s.ressenti, s.updated_at, e.nom AS eleve_nom, e.prenom AS eleve_prenom, e.classe AS eleve_classe
       FROM suivi_hebdo s
       INNER JOIN eleves e ON e.id = s.id_eleves
       ${idEleve ? 'WHERE s.id_eleves = ?' : ''}
       ORDER BY e.nom ASC, e.prenom ASC, s.annee DESC, s.semaine DESC`,
      idEleve ? [idEleve] : [],
    );

    const filteredRows = anneeScolaire
      ? (() => {
          const { start, end } = getSchoolYearRange(anneeScolaire);
          return rows.filter((row) => {
            const weekStart = getWeekStart(Number(row.semaine), Number(row.annee));
            return weekStart >= start && weekStart < end;
          });
        })()
      : rows;

    const header = ['eleve_nom', 'eleve_prenom', 'eleve_classe', 'annee', 'semaine', 'ressenti', 'contenu', 'modifie_le'];
    const lines = filteredRows.map((row) => [
      row.eleve_nom,
      row.eleve_prenom,
      row.eleve_classe ?? '',
      row.annee,
      row.semaine,
      row.ressenti ? RESSENTI_LABELS[Number(row.ressenti)] ?? '' : '',
      row.contenu,
      row.updated_at,
    ]);

    const escapeValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [header, ...lines].map((row) => row.map(escapeValue).join(';')).join('\n');
    const filename = anneeScolaire
      ? `suivi-annee-${anneeScolaire - 1}-${anneeScolaire}.csv`
      : idEleve
        ? `suivi-eleve-${idEleve}.csv`
        : 'suivi-historique.csv';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`\uFEFF${csv}`);
  } catch (error) {
    res.status(500).json({ message: 'Impossible d’exporter le suivi.', error });
  }
});

/** Historique complet du suivi d'un élève, semaine par semaine. */
router.get('/eleve/:id', requireAdmin, async (req, res) => {
  try {
    const rows = await query<SuiviRow[]>(
      'SELECT * FROM suivi_hebdo WHERE id_eleves = ? ORDER BY annee DESC, semaine DESC',
      [req.params.id],
    );
    res.json(rows.map(mapSuivi));
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer le suivi de l’élève.', error });
  }
});

/** Crée ou met à jour le suivi d'un élève pour une semaine donnée. */
router.put('/', requireAdmin, async (req, res) => {
  const idEleve = Number(req.body.id_eleves);
  const semaine = Number(req.body.semaine);
  const annee = Number(req.body.annee);
  const contenu = typeof req.body.contenu === 'string' ? req.body.contenu.trim() : '';
  const ressentiRaw = req.body.ressenti;
  const ressenti = ressentiRaw === null || ressentiRaw === undefined || ressentiRaw === '' ? null : Number(ressentiRaw);

  if (!idEleve || !semaine || !annee || !contenu) {
    return res.status(400).json({ message: 'Élève, semaine, année et contenu sont obligatoires.' });
  }
  if (ressenti !== null && ![1, 2, 3, 4].includes(ressenti)) {
    return res.status(400).json({ message: 'Ressenti invalide.' });
  }

  try {
    await query<ResultSetHeader>(
      `INSERT INTO suivi_hebdo (id_eleves, semaine, annee, contenu, ressenti)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE contenu = VALUES(contenu), ressenti = VALUES(ressenti)`,
      [idEleve, semaine, annee, contenu, ressenti],
    );
    const [row] = await query<SuiviRow[]>(
      'SELECT * FROM suivi_hebdo WHERE id_eleves = ? AND semaine = ? AND annee = ?',
      [idEleve, semaine, annee],
    );
    res.json(mapSuivi(row));
  } catch (error) {
    res.status(500).json({ message: 'Impossible d’enregistrer le suivi.', error });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query<ResultSetHeader>('DELETE FROM suivi_hebdo WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Impossible de supprimer le suivi.', error });
  }
});

export default router;
