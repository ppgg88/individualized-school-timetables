import { ResultSetHeader, RowDataPacket } from 'mysql2';
import crypto from 'crypto';
import { Router } from 'express';
import { query } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Admin uniquement : cette liste expose le token d'accès de chaque professeur.
router.get('/', requireAdmin, async (_req, res) => {
  try {
    const rows = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, token, id_importation FROM proph ORDER BY nom ASC, prenom ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer les professeurs.', error });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { nom, prenom, mail } = req.body;
  if (!nom || !prenom) {
    return res.status(400).json({ message: 'Les champs nom et prénom sont obligatoires.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  try {
    const result = await query<ResultSetHeader>('INSERT INTO proph (nom, prenom, mail, token) VALUES (?, ?, ?, ?)', [nom, prenom, mail || null, token]);
    const [created] = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, token, id_importation FROM proph WHERE id = ?', [result.insertId]);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de créer le professeur.', error });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, mail } = req.body;
  if (!nom || !prenom) {
    return res.status(400).json({ message: 'Les champs nom et prénom sont obligatoires.' });
  }

  try {
    await query<ResultSetHeader>('UPDATE proph SET nom = ?, prenom = ?, mail = ? WHERE id = ?', [nom, prenom, mail || null, id]);
    const [updated] = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, token, id_importation FROM proph WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de mettre à jour le professeur.', error });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query<ResultSetHeader>('DELETE FROM proph WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Impossible de supprimer le professeur.', error });
  }
});

// Invalide l'ancien lien/QR code du professeur (ex. en cas de perte ou de partage accidentel)
// en lui attribuant un nouveau token secret.
router.post('/:id/regenerate-token', requireAdmin, async (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  try {
    await query<ResultSetHeader>('UPDATE proph SET token = ? WHERE id = ?', [token, req.params.id]);
    const [updated] = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, token, id_importation FROM proph WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de régénérer la clé du professeur.', error });
  }
});

export default router;
