import type { Rdv } from '../types';

/** Clé de regroupement : même heure + même prof + même lieu (= même cours avec plusieurs élèves) */
export function rdvSlotKey(rdv: Rdv) {
  return `${rdv.date}|${rdv.id_proph ?? 0}|${rdv.lieu}`;
}

export interface RdvGroups {
  /** Un rdv "représentant" par créneau, à utiliser pour l'affichage */
  representativeRdvs: Rdv[];
  /** rdv représentant.id → tous les rdv du créneau (tous les élèves) */
  groupMap: Map<number, Rdv[]>;
  /** rdv représentant.id → nombre d'élèves du créneau */
  groupSizes: Map<number, number>;
}

/** Regroupe une liste de rdv par créneau (même heure + prof + lieu) pour un affichage joint. */
export function groupRdvBySlot(rdvList: Rdv[]): RdvGroups {
  const groups = new Map<string, Rdv[]>();

  for (const rdv of rdvList) {
    const key = rdvSlotKey(rdv);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rdv);
  }

  const representativeRdvs: Rdv[] = [];
  const groupMap = new Map<number, Rdv[]>();
  const groupSizes = new Map<number, number>();

  for (const group of groups.values()) {
    const rep = group[0];
    representativeRdvs.push(rep);
    groupMap.set(rep.id, group);
    groupSizes.set(rep.id, group.length);
  }

  return { representativeRdvs, groupMap, groupSizes };
}
