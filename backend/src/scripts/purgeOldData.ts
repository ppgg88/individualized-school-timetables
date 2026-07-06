import { RowDataPacket } from 'mysql2';
import { pool, query } from '../db';
import { formatMysqlDateTime, getWeekStart } from '../utils/date';

/**
 * Purge RGPD : supprime les données personnelles dont la durée de conservation est dépassée.
 *
 * - Rendez-vous (rdv) et suivis hebdomadaires plus vieux que la durée de rétention sont supprimés
 *   sans condition : ce sont eux qui portent la date de référence.
 * - Élèves / formateurs ne sont supprimés que si leur import date de plus de la durée de
 *   rétention ET qu'il ne leur reste plus aucun rendez-vous / suivi (donc aucune activité
 *   récente) — ce qui évite de supprimer un élève ou un formateur encore actif.
 * - Les lots d'import devenus orphelins (plus aucun élève/formateur/rdv rattaché) sont supprimés
 *   en dernier.
 *
 * Usage : node dist/scripts/purgeOldData.js [--dry-run]
 * Variable d'env RETENTION_YEARS pour changer la durée par défaut (10 ans).
 */

const RETENTION_YEARS = Number(process.env.RETENTION_YEARS ?? 10);
const DRY_RUN = process.argv.includes('--dry-run');

function cutoffDate(): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - RETENTION_YEARS);
  return date;
}

async function purgeOldRdv(cutoff: string): Promise<number> {
  const rows = await query<RowDataPacket[]>('SELECT id FROM rdv WHERE date < ?', [cutoff]);
  if (rows.length && !DRY_RUN) {
    await query('DELETE FROM rdv WHERE date < ?', [cutoff]);
  }
  return rows.length;
}

async function purgeOldSuivi(cutoff: Date): Promise<number> {
  const rows = await query<RowDataPacket[]>('SELECT id, semaine, annee FROM suivi_hebdo', []);
  const staleIds = rows
    .filter((row) => getWeekStart(Number(row.semaine), Number(row.annee)) < cutoff)
    .map((row) => Number(row.id));

  if (staleIds.length && !DRY_RUN) {
    const placeholders = staleIds.map(() => '?').join(', ');
    await query(`DELETE FROM suivi_hebdo WHERE id IN (${placeholders})`, staleIds);
  }
  return staleIds.length;
}

async function purgeOrphanEleves(cutoff: string): Promise<number> {
  const rows = await query<RowDataPacket[]>(
    `SELECT e.id FROM eleves e
     INNER JOIN importation i ON i.id = e.id_importation
     WHERE i.date < ?
       AND NOT EXISTS (SELECT 1 FROM rdv r WHERE r.id_eleves = e.id)
       AND NOT EXISTS (SELECT 1 FROM suivi_hebdo s WHERE s.id_eleves = e.id)`,
    [cutoff],
  );
  const ids = rows.map((row) => Number(row.id));
  if (ids.length && !DRY_RUN) {
    const placeholders = ids.map(() => '?').join(', ');
    await query(`DELETE FROM eleves WHERE id IN (${placeholders})`, ids);
  }
  return ids.length;
}

async function purgeOrphanProfs(cutoff: string): Promise<number> {
  const rows = await query<RowDataPacket[]>(
    `SELECT p.id FROM proph p
     INNER JOIN importation i ON i.id = p.id_importation
     WHERE i.date < ?
       AND NOT EXISTS (SELECT 1 FROM rdv r WHERE r.id_proph = p.id)`,
    [cutoff],
  );
  const ids = rows.map((row) => Number(row.id));
  if (ids.length && !DRY_RUN) {
    const placeholders = ids.map(() => '?').join(', ');
    await query(`DELETE FROM proph WHERE id IN (${placeholders})`, ids);
  }
  return ids.length;
}

async function purgeOrphanImportations(cutoff: string): Promise<number> {
  const rows = await query<RowDataPacket[]>(
    `SELECT i.id FROM importation i
     WHERE i.date < ?
       AND NOT EXISTS (SELECT 1 FROM eleves e WHERE e.id_importation = i.id)
       AND NOT EXISTS (SELECT 1 FROM proph p WHERE p.id_importation = i.id)
       AND NOT EXISTS (SELECT 1 FROM rdv r WHERE r.id_importation = i.id)`,
    [cutoff],
  );
  const ids = rows.map((row) => Number(row.id));
  if (ids.length && !DRY_RUN) {
    const placeholders = ids.map(() => '?').join(', ');
    await query(`DELETE FROM importation WHERE id IN (${placeholders})`, ids);
  }
  return ids.length;
}

async function main() {
  const cutoffObj = cutoffDate();
  const cutoff = formatMysqlDateTime(cutoffObj);
  const prefix = '[purge-rgpd]';

  console.log(`${prefix} Suppression des données de plus de ${RETENTION_YEARS} ans (avant ${cutoff})${DRY_RUN ? ' — DRY RUN, aucune suppression réelle' : ''}.`);

  console.log(`${prefix} Rendez-vous supprimés : ${await purgeOldRdv(cutoff)}`);
  console.log(`${prefix} Suivis hebdomadaires supprimés : ${await purgeOldSuivi(cutoffObj)}`);
  console.log(`${prefix} Élèves supprimés (import ancien, plus aucune donnée rattachée) : ${await purgeOrphanEleves(cutoff)}`);
  console.log(`${prefix} Formateurs supprimés (import ancien, plus aucun rendez-vous rattaché) : ${await purgeOrphanProfs(cutoff)}`);
  console.log(`${prefix} Lots d'import supprimés (devenus orphelins) : ${await purgeOrphanImportations(cutoff)}`);

  console.log(`${prefix} Terminé.`);
}

main()
  .catch((error) => {
    console.error('[purge-rgpd] Échec de la purge :', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
