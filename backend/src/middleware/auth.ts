import { NextFunction, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { query } from '../db';

declare global {
  namespace Express {
    interface Request {
      /** ID du prof authentifié par son token (x-prof-key) */
      profId?: number;
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expectedKey = process.env.ADMIN_KEY;
  const providedKey = req.header('x-admin-key') ?? (typeof req.query.key === 'string' ? req.query.key : undefined);

  if (!expectedKey) {
    return res.status(500).json({ message: 'ADMIN_KEY non configurée.' });
  }

  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({ message: 'Clé administrateur invalide.' });
  }

  next();
}

/** Accepte la clé admin ou la clé vie-scolaire (pas les tokens élève/prof, réservés aux vues individuelles). */
export function requireAdminOrVs(req: Request, res: Response, next: NextFunction) {
  const adminKey = process.env.ADMIN_KEY;
  const vsKey = process.env.VS_KEY;

  const adminProvided = req.header('x-admin-key') ?? (typeof req.query.key === 'string' ? req.query.key : undefined);
  if (adminProvided && adminKey && adminProvided === adminKey) return next();

  const vsProvided = req.header('x-vs-key');
  if (vsProvided && vsKey && vsProvided === vsKey) return next();

  return res.status(401).json({ message: 'Accès non autorisé.' });
}

/** Accepte la clé admin, la clé vie-scolaire ou le token d'un prof. */
export async function requireAbsenceAuth(req: Request, res: Response, next: NextFunction) {
  const adminKey = process.env.ADMIN_KEY;
  const vsKey    = process.env.VS_KEY;

  // Admin key
  const adminProvided = req.header('x-admin-key') ?? (typeof req.query.key === 'string' ? req.query.key : undefined);
  if (adminProvided && adminKey && adminProvided === adminKey) return next();

  // Vie-scolaire key
  const vsProvided = req.header('x-vs-key');
  if (vsProvided && vsKey && vsProvided === vsKey) return next();

  // Prof token
  const profKey = req.header('x-prof-key');
  if (profKey) {
    try {
      const rows = await query<RowDataPacket[]>('SELECT id FROM proph WHERE token = ?', [profKey]);
      if (rows.length) {
        req.profId = Number(rows[0].id);
        return next();
      }
    } catch { /* fall through */ }
  }

  return res.status(401).json({ message: 'Clé invalide pour la mise à jour des absences.' });
}
