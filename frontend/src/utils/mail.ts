import type { SendMailResult } from '../api';

/** Résume un SendMailResult en un titre de toast lisible. */
export function mailResultToastTitle(result: SendMailResult): string {
  const parts = [`${result.sent} email${result.sent > 1 ? 's' : ''} envoyé${result.sent > 1 ? 's' : ''}`];
  if (result.skipped.length) parts.push(`${result.skipped.length} sans adresse mail`);
  if (result.failed.length) parts.push(`${result.failed.length} échec(s)`);
  return parts.join(' · ');
}
