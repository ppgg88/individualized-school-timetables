import { RowDataPacket } from 'mysql2';
import { Router } from 'express';
import { query } from '../db';
import { requireAdmin } from '../middleware/auth';
import { isMailConfigured, sendMail } from '../utils/mailer';
import { formatMysqlDateTime, getIsoWeekRange } from '../utils/date';

const router = Router();

interface SendResult {
  sent: number;
  skipped: string[];
  failed: string[];
}

function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? 'http://localhost:3000';
}

function wrapEmail(greeting: string, intro: string, url: string, buttonLabel: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
      <p style="text-align: center; margin: 0 0 16px;">
        <img src="${frontendUrl()}/roville-logo.png" alt="École de ROVILLE" width="120" style="display: inline-block;" />
      </p>
      <p style="font-size: 11px; font-weight: bold; color: #2FC900; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">
        Dispositif d'Individualisation
      </p>
      <h2 style="margin: 0 0 12px; font-size: 20px;">${greeting}</h2>
      <p style="line-height: 1.5;">${intro}</p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${url}" style="background: #2FC901; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          ${buttonLabel}
        </a>
      </p>
      <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        École de ROVILLE — Dispositif d'Individualisation
      </p>
    </div>
  `;
}

function eleveEmail(prenom: string, url: string): { subject: string; html: string } {
  return {
    subject: 'Votre emploi du temps individuel',
    html: wrapEmail(
      `Bonjour ${prenom},`,
      "Voici le lien vers votre emploi du temps d'individualisation. Vous pouvez le consulter à tout moment, il est toujours à jour.",
      url,
      'Consulter mon emploi du temps',
    ),
  };
}

function profEmail(prenom: string, url: string): { subject: string; html: string } {
  return {
    subject: 'Votre emploi du temps formateur',
    html: wrapEmail(
      `Bonjour ${prenom},`,
      "Voici le lien vers votre emploi du temps formateur pour le dispositif d'individualisation. Il vous permet aussi de déclarer les absences de vos élèves.",
      url,
      'Consulter mon emploi du temps',
    ),
  };
}

function eleveChangeEmail(prenom: string, url: string): { subject: string; html: string } {
  return {
    subject: 'Modification de votre emploi du temps',
    html: wrapEmail(
      `Bonjour ${prenom},`,
      "Un rendez-vous de votre emploi du temps d'individualisation de cette semaine vient d'être modifié. Consultez votre emploi du temps à jour via le lien ci-dessous.",
      url,
      'Consulter mon emploi du temps',
    ),
  };
}

function profChangeEmail(prenom: string, url: string): { subject: string; html: string } {
  return {
    subject: 'Modification de votre emploi du temps',
    html: wrapEmail(
      `Bonjour ${prenom},`,
      "Un rendez-vous de votre emploi du temps formateur pour le dispositif d'individualisation de cette semaine vient d'être modifié. Consultez votre emploi du temps à jour via le lien ci-dessous.",
      url,
      'Consulter mon emploi du temps',
    ),
  };
}

router.use((_req, res, next) => {
  if (!isMailConfigured()) {
    return res.status(503).json({ message: "L'envoi d'emails n'est pas configuré sur le serveur (variables SMTP_* manquantes)." });
  }
  next();
});

router.post('/eleve/:id', requireAdmin, async (req, res) => {
  try {
    const rows = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail FROM eleves WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Élève introuvable.' });
    const eleve = rows[0];
    if (!eleve.mail) return res.status(400).json({ message: "Cet élève n'a pas d'adresse mail renseignée." });

    const url = `${frontendUrl()}/eleve/${eleve.id}`;
    const { subject, html } = eleveEmail(String(eleve.prenom), url);
    await sendMail(String(eleve.mail), subject, html);
    res.json({ sent: 1, skipped: [], failed: [] } satisfies SendResult);
  } catch (error) {
    res.status(500).json({ message: "Impossible d'envoyer l'email.", error });
  }
});

router.post('/eleves', requireAdmin, async (req, res) => {
  try {
    const semaine = req.query.semaine ? Number(req.query.semaine) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    let eleves: RowDataPacket[];
    if (semaine && year) {
      const { start, end } = getIsoWeekRange(semaine, year);
      eleves = await query<RowDataPacket[]>(
        `SELECT DISTINCT e.id, e.nom, e.prenom, e.mail
         FROM eleves e
         INNER JOIN rdv r ON r.id_eleves = e.id
         WHERE r.date >= ? AND r.date < ?
         ORDER BY e.nom, e.prenom`,
        [formatMysqlDateTime(start), formatMysqlDateTime(end)],
      );
    } else {
      eleves = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail FROM eleves ORDER BY nom, prenom');
    }
    const result: SendResult = { sent: 0, skipped: [], failed: [] };

    await Promise.all(
      eleves.map(async (eleve) => {
        const label = `${eleve.prenom} ${eleve.nom}`;
        if (!eleve.mail) {
          result.skipped.push(label);
          return;
        }
        try {
          const url = `${frontendUrl()}/eleve/${eleve.id}`;
          const { subject, html } = eleveEmail(String(eleve.prenom), url);
          await sendMail(String(eleve.mail), subject, html);
          result.sent += 1;
        } catch {
          result.failed.push(label);
        }
      }),
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Impossible d'envoyer les emails.", error });
  }
});

router.post('/prof/:id', requireAdmin, async (req, res) => {
  try {
    const rows = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, token FROM proph WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Formateur introuvable.' });
    const prof = rows[0];
    if (!prof.mail) return res.status(400).json({ message: "Ce formateur n'a pas d'adresse mail renseignée." });

    const url = `${frontendUrl()}/prof/${prof.id}${prof.token ? `?key=${prof.token}` : ''}`;
    const { subject, html } = profEmail(String(prof.prenom), url);
    await sendMail(String(prof.mail), subject, html);
    res.json({ sent: 1, skipped: [], failed: [] } satisfies SendResult);
  } catch (error) {
    res.status(500).json({ message: "Impossible d'envoyer l'email.", error });
  }
});

router.post('/profs', requireAdmin, async (req, res) => {
  try {
    const semaine = req.query.semaine ? Number(req.query.semaine) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    let profs: RowDataPacket[];
    if (semaine && year) {
      const { start, end } = getIsoWeekRange(semaine, year);
      profs = await query<RowDataPacket[]>(
        `SELECT DISTINCT p.id, p.nom, p.prenom, p.mail, p.token
         FROM proph p
         INNER JOIN rdv r ON r.id_proph = p.id
         WHERE r.date >= ? AND r.date < ?
         ORDER BY p.nom, p.prenom`,
        [formatMysqlDateTime(start), formatMysqlDateTime(end)],
      );
    } else {
      profs = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, token FROM proph ORDER BY nom, prenom');
    }
    const result: SendResult = { sent: 0, skipped: [], failed: [] };

    await Promise.all(
      profs.map(async (prof) => {
        const label = `${prof.prenom} ${prof.nom}`;
        if (!prof.mail) {
          result.skipped.push(label);
          return;
        }
        try {
          const url = `${frontendUrl()}/prof/${prof.id}${prof.token ? `?key=${prof.token}` : ''}`;
          const { subject, html } = profEmail(String(prof.prenom), url);
          await sendMail(String(prof.mail), subject, html);
          result.sent += 1;
        } catch {
          result.failed.push(label);
        }
      }),
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Impossible d'envoyer les emails.", error });
  }
});

/** Prévient les élèves et/ou le formateur concernés qu'un rendez-vous vient d'être modifié. */
router.post('/notify-change', requireAdmin, async (req, res) => {
  try {
    const eleveIds: number[] = Array.isArray(req.body.eleveIds)
      ? Array.from(new Set(req.body.eleveIds.map(Number).filter((id: number) => Number.isFinite(id) && id > 0)))
      : [];
    const profId = req.body.profId ? Number(req.body.profId) : undefined;

    const result: SendResult = { sent: 0, skipped: [], failed: [] };

    if (eleveIds.length) {
      const placeholders = eleveIds.map(() => '?').join(', ');
      const eleves = await query<RowDataPacket[]>(`SELECT id, nom, prenom, mail FROM eleves WHERE id IN (${placeholders})`, eleveIds);

      await Promise.all(
        eleves.map(async (eleve) => {
          const label = `${eleve.prenom} ${eleve.nom}`;
          if (!eleve.mail) {
            result.skipped.push(label);
            return;
          }
          try {
            const url = `${frontendUrl()}/eleve/${eleve.id}`;
            const { subject, html } = eleveChangeEmail(String(eleve.prenom), url);
            await sendMail(String(eleve.mail), subject, html);
            result.sent += 1;
          } catch {
            result.failed.push(label);
          }
        }),
      );
    }

    if (profId) {
      const rows = await query<RowDataPacket[]>('SELECT id, nom, prenom, mail, token FROM proph WHERE id = ?', [profId]);
      const prof = rows[0];
      if (prof) {
        const label = `${prof.prenom} ${prof.nom}`;
        if (!prof.mail) {
          result.skipped.push(label);
        } else {
          try {
            const url = `${frontendUrl()}/prof/${prof.id}${prof.token ? `?key=${prof.token}` : ''}`;
            const { subject, html } = profChangeEmail(String(prof.prenom), url);
            await sendMail(String(prof.mail), subject, html);
            result.sent += 1;
          } catch {
            result.failed.push(label);
          }
        }
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Impossible d'envoyer les emails.", error });
  }
});

export default router;
