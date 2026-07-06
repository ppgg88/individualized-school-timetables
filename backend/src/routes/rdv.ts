import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Router } from 'express';
import { pool, query } from '../db';
import { requireAdmin, requireAdminOrVs, requireAbsenceAuth } from '../middleware/auth';
import { formatMysqlDateTime, getIsoWeek, moveDateToIsoWeek } from '../utils/date';
import { getRdvWithFilters } from '../utils/rdv';

const router = Router();

// Liste brute des rendez-vous (filtrable par élève/formateur) : réservée à l'admin et à la vie
// scolaire, sous peine de contourner la protection par token individuel des routes /edt/*.
router.get('/', requireAdminOrVs, async (req, res) => {
  try {
    const semaine = req.query.semaine ? Number(req.query.semaine) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const ide = req.query.ide ? Number(req.query.ide) : undefined;
    const idp = req.query.idp ? Number(req.query.idp) : undefined;

    const rdv = await getRdvWithFilters({ week: semaine, year, eleveId: ide, profId: idp });
    res.json(rdv);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer les rendez-vous.', error });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { nom, date, durre, couleur, id_proph, lieu, abs = 0, repeatWeeks = [], elevesIds, id_eleves } = req.body;
  const studentIds = Array.from(new Set((Array.isArray(elevesIds) ? elevesIds : [id_eleves]).map(Number).filter(Boolean)));
  const duration = Number(durre);
  const baseDate = new Date(date);

  if (!studentIds.length || Number.isNaN(baseDate.getTime()) || !duration || !couleur || !lieu) {
    return res.status(400).json({ message: 'Les données du rendez-vous sont incomplètes.' });
  }

  const year = baseDate.getFullYear();
  const baseWeek = getIsoWeek(baseDate);
  const requestedWeeks = Array.isArray(repeatWeeks) ? repeatWeeks.map(Number).filter(Boolean) : [];
  const allWeeks = Array.from(new Set([baseWeek, ...requestedWeeks]));

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const createdIds: number[] = [];
    for (const studentId of studentIds) {
      for (const weekNumber of allWeeks) {
        const occurrenceDate = weekNumber === baseWeek ? baseDate : moveDateToIsoWeek(baseDate, weekNumber, year);
        const [result] = await connection.query<ResultSetHeader>(
          'INSERT INTO rdv (nom, date, durre, couleur, id_eleves, id_proph, lieu, abs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [nom || 'Rendez-vous', formatMysqlDateTime(occurrenceDate), duration, couleur, studentId, id_proph || null, lieu, Number(abs)],
        );
        createdIds.push(result.insertId);
      }
    }

    await connection.commit();
    const placeholders = createdIds.map(() => '?').join(', ');
    const rows = await query<RowDataPacket[]>(`SELECT id FROM rdv WHERE id IN (${placeholders})`, createdIds);
    const created = await getRdvWithFilters({});
    const createdSet = new Set(rows.map((row) => Number(row.id)));
    res.status(201).json({ created: created.filter((item) => createdSet.has(item.id)) });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Impossible de créer le rendez-vous.', error });
  } finally {
    connection.release();
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { nom, date, durre, couleur, id_eleves, id_proph, lieu, abs = 0 } = req.body;
  const appointmentDate = new Date(date);

  if (!id_eleves || Number.isNaN(appointmentDate.getTime()) || !durre || !couleur || !lieu) {
    return res.status(400).json({ message: 'Les données du rendez-vous sont incomplètes.' });
  }

  try {
    await query<ResultSetHeader>(
      'UPDATE rdv SET nom = ?, date = ?, durre = ?, couleur = ?, id_eleves = ?, id_proph = ?, lieu = ?, abs = ? WHERE id = ?',
      [nom || 'Rendez-vous', formatMysqlDateTime(appointmentDate), Number(durre), couleur, Number(id_eleves), id_proph || null, lieu, Number(abs), req.params.id],
    );
    const updated = await getRdvWithFilters({});
    const match = updated.find((item) => item.id === Number(req.params.id));
    res.json(match ?? null);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de mettre à jour le rendez-vous.', error });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query<ResultSetHeader>('DELETE FROM rdv WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Impossible de supprimer le rendez-vous.', error });
  }
});

router.patch('/:id/absence', requireAbsenceAuth, async (req, res) => {
  const abs = Number(req.body.abs);
  if (![-1, 0, 1, 2, 4].includes(abs)) {
    return res.status(400).json({ message: 'Statut d\'absence invalide.' });
  }

  // Si authentifié par token prof, vérifier qu'il est bien le formateur du RDV
  if (req.profId !== undefined) {
    const rows = await query<RowDataPacket[]>('SELECT id_proph FROM rdv WHERE id = ?', [req.params.id]);
    if (!rows.length || Number(rows[0].id_proph) !== req.profId) {
      return res.status(403).json({ message: 'Vous n\'êtes pas le formateur de ce rendez-vous.' });
    }
  }

  try {
    await query<ResultSetHeader>('UPDATE rdv SET abs = ? WHERE id = ?', [abs, req.params.id]);
    const updated = await getRdvWithFilters({});
    const match = updated.find((item) => item.id === Number(req.params.id));
    res.json(match ?? null);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de mettre à jour le statut d\'absence.', error });
  }
});

/** Mise à jour en masse : marquer un élève absent sur une période */
router.patch('/bulk-absence', requireAbsenceAuth, async (req, res) => {
  const { id_eleves, dateFrom, dateTo, abs } = req.body;
  const eleveId = Number(id_eleves);
  const absVal  = Number(abs);
  const from    = new Date(dateFrom);
  const to      = new Date(dateTo);
  to.setHours(23, 59, 59, 999); // inclure toute la journée de fin

  if (!eleveId || ![-1, 0, 1, 2, 4].includes(absVal) || isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return res.status(400).json({ message: 'Paramètres invalides (élève, dates ou statut manquant).' });
  }

  // Les profs ne peuvent pas utiliser cette route (uniquement admin / vie-scolaire)
  if (req.profId !== undefined) {
    return res.status(403).json({ message: 'Les formateurs ne peuvent pas faire de mise à jour en masse.' });
  }

  try {
    const result = await query<ResultSetHeader>(
      'UPDATE rdv SET abs = ? WHERE id_eleves = ? AND date BETWEEN ? AND ?',
      [absVal, eleveId, from.toISOString().slice(0, 19).replace('T', ' '), to.toISOString().slice(0, 19).replace('T', ' ')],
    );
    res.json({ updated: result.affectedRows });
  } catch (error) {
    res.status(500).json({ message: 'Impossible de mettre à jour les absences.', error });
  }
});

export default router;
