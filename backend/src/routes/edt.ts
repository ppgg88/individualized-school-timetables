import { Request, Router } from 'express';
import { RowDataPacket } from 'mysql2';
import { query } from '../db';
import { requireAdminOrVs } from '../middleware/auth';
import { getIsoWeek, getWeekStart } from '../utils/date';
import { getRdvWithFilters } from '../utils/rdv';

const router = Router();

function isAdminRequest(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  const provided = req.header('x-admin-key') ?? (typeof req.query.key === 'string' ? req.query.key : undefined);
  return Boolean(expected && provided && provided === expected);
}

/** Ramène (semaine, année) à la semaine courante si elle désigne une semaine future. */
function clampToCurrentWeek(semaine?: number, year?: number): { semaine?: number; year?: number } {
  if (!semaine || !year) return { semaine, year };

  const today = new Date();
  const currentWeek = getIsoWeek(today);
  const currentYear = today.getFullYear();

  if (getWeekStart(semaine, year) > getWeekStart(currentWeek, currentYear)) {
    return { semaine: currentWeek, year: currentYear };
  }
  return { semaine, year };
}

// L'EDT général contient les rendez-vous de tous les élèves : réservé à l'admin et à la vie
// scolaire (clé x-admin-key ou x-vs-key), jamais accessible via un simple token élève/prof.
router.get('/general', requireAdminOrVs, async (req, res) => {
  try {
    const semaine = req.query.semaine ? Number(req.query.semaine) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await getRdvWithFilters({ week: semaine, year });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer l’EDT général.', error });
  }
});

router.get('/eleve/:id', async (req, res) => {
  try {
    const eleveId = Number(req.params.id);
    const isAdmin = isAdminRequest(req);

    // Hors admin, l'accès à l'EDT d'un élève exige son token personnel (fourni via le lien/QR
    // code individuel) : connaître l'id ne suffit plus à consulter l'emploi du temps d'un autre
    // élève. 404 plutôt que 403 pour ne pas confirmer l'existence d'un id à un tiers non autorisé.
    if (!isAdmin) {
      const providedToken = typeof req.query.key === 'string' ? req.query.key : undefined;
      const rows = await query<RowDataPacket[]>('SELECT token FROM eleves WHERE id = ?', [eleveId]);
      const validToken = Boolean(providedToken) && rows.length > 0 && rows[0].token === providedToken;
      if (!validToken) {
        return res.status(404).json({ message: 'Emploi du temps introuvable.' });
      }
    }

    const rawSemaine = req.query.semaine ? Number(req.query.semaine) : undefined;
    const rawYear = req.query.year ? Number(req.query.year) : undefined;
    // Les élèves ne doivent pas pouvoir consulter les semaines futures, même en appelant l'API
    // directement — mais l'admin (panel de gestion) doit pouvoir planifier à l'avance.
    const { semaine, year } = isAdmin ? { semaine: rawSemaine, year: rawYear } : clampToCurrentWeek(rawSemaine, rawYear);
    const data = await getRdvWithFilters({ week: semaine, year, eleveId });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer l’EDT élève.', error });
  }
});

router.get('/prof/:id', async (req, res) => {
  try {
    const profId = Number(req.params.id);
    const isAdmin = isAdminRequest(req);

    // Même principe que pour l'élève : hors admin, il faut le token personnel du professeur
    // (fourni via son lien individuel) pour consulter son EDT.
    if (!isAdmin) {
      const providedToken = typeof req.query.key === 'string' ? req.query.key : undefined;
      const rows = await query<RowDataPacket[]>('SELECT token FROM proph WHERE id = ?', [profId]);
      const validToken = Boolean(providedToken) && rows.length > 0 && rows[0].token === providedToken;
      if (!validToken) {
        return res.status(404).json({ message: 'Emploi du temps introuvable.' });
      }
    }

    const semaine = req.query.semaine ? Number(req.query.semaine) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const data = await getRdvWithFilters({ week: semaine, year, profId });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer l’EDT professeur.', error });
  }
});

export default router;
