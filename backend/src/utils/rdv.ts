import { query } from '../db';
import { formatMysqlDateTime, getIsoWeekRange } from './date';

export interface RdvFilters {
  week?: number;
  year?: number;
  eleveId?: number;
  profId?: number;
  /** Plage libre (ex. année scolaire), utilisée si week/year ne sont pas fournis */
  dateFrom?: Date;
  dateTo?: Date;
}

export interface RdvResponse {
  id: number;
  nom: string;
  date: string;
  durre: number;
  couleur: string;
  id_eleves: number;
  id_proph?: number;
  lieu: string;
  abs: number;
  id_importation?: number;
  eleves: {
    id: number;
    nom: string;
    prenom: string;
    mail?: string;
    classe?: string;
  };
  prof?: {
    id: number;
    nom: string;
    prenom: string;
    mail?: string;
  };
}

const RDV_SELECT = `
  SELECT
    rdv.id,
    rdv.nom,
    rdv.date,
    rdv.durre,
    rdv.couleur,
    rdv.id_eleves,
    rdv.id_proph,
    rdv.lieu,
    rdv.id_importation,
    rdv.abs,
    eleves.id AS eleve_id,
    eleves.nom AS eleve_nom,
    eleves.prenom AS eleve_prenom,
    eleves.mail AS eleve_mail,
    eleves.classe AS eleve_classe,
    proph.id AS prof_id,
    proph.nom AS prof_nom,
    proph.prenom AS prof_prenom,
    proph.mail AS prof_mail
  FROM rdv
  INNER JOIN eleves ON eleves.id = rdv.id_eleves
  LEFT JOIN proph ON proph.id = rdv.id_proph
`;

export function buildRdvFilterClause(filters: RdvFilters) {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (filters.week && filters.year) {
    const { start, end } = getIsoWeekRange(filters.week, filters.year);
    conditions.push('rdv.date >= ? AND rdv.date < ?');
    params.push(formatMysqlDateTime(start), formatMysqlDateTime(end));
  } else if (filters.dateFrom && filters.dateTo) {
    conditions.push('rdv.date >= ? AND rdv.date < ?');
    params.push(formatMysqlDateTime(filters.dateFrom), formatMysqlDateTime(filters.dateTo));
  }

  if (filters.eleveId) {
    conditions.push('rdv.id_eleves = ?');
    params.push(filters.eleveId);
  }

  if (filters.profId) {
    conditions.push('rdv.id_proph = ?');
    params.push(filters.profId);
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

export function mapRdvRow(row: Record<string, unknown>): RdvResponse {
  return {
    id: Number(row.id),
    nom: String(row.nom ?? ''),
    date: String(row.date ?? '').replace(' ', 'T'),
    durre: Number(row.durre),
    couleur: String(row.couleur ?? '#3B82F6'),
    id_eleves: Number(row.id_eleves),
    id_proph: row.id_proph === null ? undefined : Number(row.id_proph),
    lieu: String(row.lieu ?? ''),
    abs: Number(row.abs ?? 0),
    id_importation: row.id_importation === null ? undefined : Number(row.id_importation),
    eleves: {
      id: Number(row.eleve_id),
      nom: String(row.eleve_nom ?? ''),
      prenom: String(row.eleve_prenom ?? ''),
      mail: row.eleve_mail ? String(row.eleve_mail) : undefined,
      classe: row.eleve_classe ? String(row.eleve_classe) : undefined,
    },
    prof: row.prof_id
      ? {
          id: Number(row.prof_id),
          nom: String(row.prof_nom ?? ''),
          prenom: String(row.prof_prenom ?? ''),
          mail: row.prof_mail ? String(row.prof_mail) : undefined,
        }
      : undefined,
  };
}

export async function getRdvWithFilters(filters: RdvFilters): Promise<RdvResponse[]> {
  const { clause, params } = buildRdvFilterClause(filters);
  const rows = await query<Array<Record<string, unknown>>>(`${RDV_SELECT} ${clause} ORDER BY rdv.date ASC, rdv.id ASC`, params);
  return rows.map(mapRdvRow);
}
