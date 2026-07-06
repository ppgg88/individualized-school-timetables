import axios from 'axios';
import type { Eleve, EleveSemaineSuivi, Importation, Prof, Rdv, RdvPayload, Suivi } from '../types';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const adminKey = window.localStorage.getItem('edt-admin-key');
    if (adminKey) config.headers['x-admin-key'] = adminKey;
    const vsKey = window.localStorage.getItem('edt-vs-key');
    if (vsKey) config.headers['x-vs-key'] = vsKey;
    const profKey = window.localStorage.getItem('edt-prof-key');
    if (profKey) config.headers['x-prof-key'] = profKey;
  }
  return config;
});

/** Extrait le message lisible d'une erreur axios ou JS. */
export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (error.response?.status === 401) return 'Clé administrateur invalide ou manquante.';
    if (error.response?.status === 400) return 'Données invalides. Vérifiez le formulaire.';
    if (error.response?.status === 500) return 'Erreur serveur. Vérifiez que Docker est lancé.';
    if (!error.response) return 'Impossible de contacter le serveur. Docker est-il lancé ?';
  }
  return fallback;
}

export const getEleves = async () => (await api.get<Eleve[]>('/eleves')).data;
export const createEleve = async (data: Partial<Eleve>) => (await api.post<Eleve>('/eleves', data)).data;
export const updateEleve = async (id: number, data: Partial<Eleve>) => (await api.put<Eleve>(`/eleves/${id}`, data)).data;
export const deleteEleve = async (id: number) => (await api.delete(`/eleves/${id}`)).data;
export const regenerateEleveToken = async (id: number) => (await api.post<Eleve>(`/eleves/${id}/regenerate-token`)).data;

export const getProfs = async () => (await api.get<Prof[]>('/profs')).data;
export const createProf = async (data: Partial<Prof>) => (await api.post<Prof>('/profs', data)).data;
export const updateProf = async (id: number, data: Partial<Prof>) => (await api.put<Prof>(`/profs/${id}`, data)).data;
export const deleteProf = async (id: number) => (await api.delete(`/profs/${id}`)).data;
export const regenerateProfToken = async (id: number) => (await api.post<Prof>(`/profs/${id}/regenerate-token`)).data;

export const getRdvEleve = async (id: number, semaine: number, year: number, key?: string) =>
  (await api.get<Rdv[]>(`/edt/eleve/${id}`, { params: { semaine, year, key } })).data;
export const getRdvProf = async (id: number, semaine: number, year: number, key?: string) =>
  (await api.get<Rdv[]>(`/edt/prof/${id}`, { params: { semaine, year, key } })).data;
export const getRdvGeneral = async (semaine: number, year: number) =>
  (await api.get<Rdv[]>('/edt/general', { params: { semaine, year } })).data;

export const createRdv = async (data: RdvPayload) => (await api.post<{ created: Rdv[] }>('/rdv', data)).data;
export const updateRdv = async (id: number, data: RdvPayload) => (await api.put<Rdv>(`/rdv/${id}`, data)).data;
export const deleteRdv = async (id: number) => (await api.delete(`/rdv/${id}`)).data;
export const updateAbsence = async (id: number, abs: number) => (await api.patch<Rdv>(`/rdv/${id}/absence`, { abs })).data;
export const bulkAbsence = async (payload: { id_eleves: number; dateFrom: string; dateTo: string; abs: number }) =>
  (await api.patch<{ updated: number }>('/rdv/bulk-absence', payload)).data;

export const exportCsv = async (params: { semaine: number; year: number } | { anneeScolaire: number }) =>
  (await api.get<Blob>('/export', { params, responseType: 'blob' })).data;

export const importCsv = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return (await api.post('/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};

export const getImportHistory = async () => (await api.get<Importation[]>('/import/history')).data;

export interface SendMailResult {
  sent: number;
  skipped: string[];
  failed: string[];
}

export const sendEleveMail = async (id: number) => (await api.post<SendMailResult>(`/mail/eleve/${id}`)).data;
/** Sans `week`, envoie à tous les élèves. Avec `week`, seulement à ceux ayant un RDV cette semaine-là. */
export const sendAllElevesMail = async (week?: { semaine: number; year: number }) =>
  (await api.post<SendMailResult>('/mail/eleves', null, { params: week })).data;
export const sendProfMail = async (id: number) => (await api.post<SendMailResult>(`/mail/prof/${id}`)).data;
/** Sans `week`, envoie à tous les formateurs. Avec `week`, seulement à ceux ayant un RDV cette semaine-là. */
export const sendAllProfsMail = async (week?: { semaine: number; year: number }) =>
  (await api.post<SendMailResult>('/mail/profs', null, { params: week })).data;

/** Prévient par email les élèves et/ou le formateur qu'un rendez-vous vient d'être modifié. */
export const notifyRdvChange = async (payload: { eleveIds: number[]; profId?: number }) =>
  (await api.post<SendMailResult>('/mail/notify-change', payload)).data;

export const getSuiviSemaine = async (semaine: number, year: number) =>
  (await api.get<EleveSemaineSuivi[]>('/suivi/semaine', { params: { semaine, year } })).data;
export const getSuiviEleve = async (id: number) => (await api.get<Suivi[]>(`/suivi/eleve/${id}`)).data;
export const saveSuivi = async (payload: { id_eleves: number; semaine: number; annee: number; contenu: string; ressenti: number | null }) =>
  (await api.put<Suivi>('/suivi', payload)).data;
export const deleteSuivi = async (id: number) => (await api.delete(`/suivi/${id}`)).data;
export const exportSuivi = async (params: { idEleve?: number; anneeScolaire?: number } = {}) =>
  (await api.get<Blob>('/suivi/export', {
    params: { id_eleves: params.idEleve, anneeScolaire: params.anneeScolaire },
    responseType: 'blob',
  })).data;

export default api;
