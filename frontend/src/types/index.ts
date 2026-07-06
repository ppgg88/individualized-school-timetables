export interface Eleve {
  id: number;
  nom: string;
  prenom: string;
  mail?: string;
  classe?: string;
  token?: string;
}

export interface Prof {
  id: number;
  nom: string;
  prenom: string;
  mail?: string;
  token?: string;
}

export interface Rdv {
  id: number;
  nom: string;
  date: string;
  durre: number;
  couleur: string;
  id_eleves: number;
  id_proph?: number;
  lieu: string;
  abs: number;
  eleves?: Eleve;
  prof?: Prof;
}

export const COULEURS = [
  { label: 'CDR', value: '#9BD9EE' },
  { label: 'Pépinière', value: '#7CCB06' },
  { label: 'Serres', value: '#ADFF2F' },
  { label: 'Individualisation', value: '#DF9FDF' },
  { label: 'Cours prof', value: '#DBE2D0' },
  { label: 'Arexhor', value: '#F3E768' },
  { label: 'À confirmer', value: '#FD9BAA' },
] as const;

export const ABSENCE_STATUS = [
  { label: 'Non renseigné', value: 0 },
  { label: 'Absent', value: -1 },
  { label: 'Présent', value: 1 },
  { label: 'Annulé', value: 2 },
  { label: 'Formateur absent', value: 4 },
] as const;

export interface Importation {
  id: number;
  nom: string;
  date: string;
  rdvCount?: number;
}

export interface RdvPayload {
  nom: string;
  date: string;
  durre: number;
  couleur: string;
  id_eleves?: number;
  elevesIds?: number[];
  id_proph?: number;
  lieu: string;
  abs: number;
  repeatWeeks?: number[];
}

export interface RdvFormValues {
  nom: string;
  date: string;
  time: string;
  durre: number;
  couleur: string;
  elevesIds: number[];
  id_proph?: number;
  lieu: string;
  abs: number;
  repeatWeeks: string;
}

export const RESSENTI_OPTIONS = [
  { label: 'Très bien', value: 1, emoji: '😊' },
  { label: 'Bien', value: 2, emoji: '🙂' },
  { label: 'Neutre', value: 3, emoji: '😐' },
  { label: 'Difficile', value: 4, emoji: '😕' },
] as const;

export interface Suivi {
  id: number;
  id_eleves: number;
  semaine: number;
  annee: number;
  contenu: string;
  ressenti: number | null;
  updatedAt: string;
}

export interface EleveSemaineSuivi {
  id: number;
  nom: string;
  prenom: string;
  classe?: string;
  suivi: Suivi | null;
}
