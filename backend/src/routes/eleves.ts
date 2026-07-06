import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db';
import { requireAdmin, requireAdminOrVs } from '../middleware/auth';

const router = Router();

// Réservé à l'admin et à la vie scolaire : la liste complète (avec le token d'accès de chaque
// élève) ne doit jamais être exposée publiquement, sous peine de rendre les liens/QR codes
// individuels devinables.
router.get('/', requireAdminOrVs, async (_req, res) => {
  try {
    const rows = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, classe, token, id_importation FROM eleves ORDER BY nom ASC, prenom ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer les élèves.', error });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { nom, prenom, mail, classe } = req.body;
  if (!nom || !prenom) {
    return res.status(400).json({ message: 'Les champs nom et prénom sont obligatoires.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  try {
    const result = await query<ResultSetHeader>(
      'INSERT INTO eleves (nom, prenom, mail, classe, token) VALUES (?, ?, ?, ?, ?)',
      [nom, prenom, mail || null, classe || null, token],
    );
    const [created] = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, classe, token, id_importation FROM eleves WHERE id = ?', [result.insertId]);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de créer l’élève.', error });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, mail, classe } = req.body;
  if (!nom || !prenom) {
    return res.status(400).json({ message: 'Les champs nom et prénom sont obligatoires.' });
  }

  try {
    await query<ResultSetHeader>(
      'UPDATE eleves SET nom = ?, prenom = ?, mail = ?, classe = ? WHERE id = ?',
      [nom, prenom, mail || null, classe || null, id],
    );
    const [updated] = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, classe, token, id_importation FROM eleves WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de mettre à jour l’élève.', error });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query<ResultSetHeader>('DELETE FROM eleves WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Impossible de supprimer l’élève.', error });
  }
});

// Invalide l'ancien lien/QR code de l'élève (ex. en cas de perte ou de partage accidentel)
// en lui attribuant un nouveau token secret.
router.post('/:id/regenerate-token', requireAdmin, async (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  try {
    await query<ResultSetHeader>('UPDATE eleves SET token = ? WHERE id = ?', [token, req.params.id]);
    const [updated] = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, classe, token, id_importation FROM eleves WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de régénérer la clé de l’élève.', error });
  }
});

export default router;
