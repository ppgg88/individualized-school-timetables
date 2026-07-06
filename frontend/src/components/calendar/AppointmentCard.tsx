import { format, parseISO, addMinutes } from 'date-fns';
import type { Rdv } from '../../types';

// Couleurs fixes (non affectées par le mode sombre) : ces badges sont posés sur le fond
// coloré arbitraire du rendez-vous (rdv.couleur), qui ne s'adapte pas au thème.
export const absenceStyles: Record<number, string> = {
  [-1]: 'bg-red-600 text-gray-50',
  1: 'bg-emerald-600 text-gray-50',
  2: 'bg-amber-500 text-gray-50',
  4: 'bg-orange-600 text-gray-50',
};

export const absenceLabels: Record<number, string> = {
  [-1]: 'Absent',
  1: 'Présent',
  2: 'Annulé',
  4: 'Form. absent',
};

export function AppointmentCard({ rdv, isPreview = false }: { rdv: Rdv; isPreview?: boolean }) {
  const start = parseISO(rdv.date);
  const end = addMinutes(start, rdv.durre);
  const timeRange = `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  const teacherLabel = rdv.prof ? `${rdv.prof.prenom.charAt(0)}. ${rdv.prof.nom}` : null;
  const absStyle = absenceStyles[rdv.abs];
  const absLabel = absenceLabels[rdv.abs];

  // Taille de la carte en minutes ≈ pixels
  const isTiny    = rdv.durre < 25;   // < 25 min → une seule ligne
  const isSmall   = rdv.durre < 50;   // 25-49 min → lieu + horaire
  const isCompact = rdv.durre < 80;   // 50-79 min → + nom
  // >= 80 min → tout affiché

  // Contenu du tooltip (toujours complet)
  const tooltipLines = [
    rdv.lieu,
    timeRange + ` (${rdv.durre} min)`,
    rdv.nom,
    teacherLabel,
    rdv.eleves ? `${rdv.eleves.prenom} ${rdv.eleves.nom}${rdv.eleves.classe ? ` · ${rdv.eleves.classe}` : ''}` : null,
    absLabel ? `Présence : ${absLabel}` : null,
  ].filter(Boolean) as string[];

  return (
    // Le wrapper group permet de positionner le tooltip en dehors du overflow-hidden
    <div className="group relative h-full">
      {/* Badge "Nouveau" pour l'aperçu d'un rendez-vous pas encore créé */}
      {isPreview && (
        <span className="absolute -left-1 -top-2 z-10 rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-gray-50 shadow">
          Nouveau
        </span>
      )}
      {/* Carte principale — couleurs fixes (gray-*) : le fond vient de rdv.couleur, arbitraire et
          indépendant du thème, donc le texte ne doit jamais suivre le mode sombre sous peine d'être illisible. */}
      <div
        className={`h-full overflow-hidden rounded-2xl border px-2.5 py-1.5 shadow-md transition hover:shadow-lg ${
          isPreview ? 'border-2 border-blue-500 ring-2 ring-blue-300 ring-offset-1' : 'border-gray-50/60'
        }`}
        style={{ backgroundColor: rdv.couleur }}
      >
        {isTiny ? (
          /* Très petit : une seule ligne compacte */
          <p className="truncate text-[11px] font-semibold text-gray-900 leading-none">
            {rdv.lieu} <span className="font-normal text-gray-700">{timeRange}</span>
          </p>
        ) : isSmall ? (
          /* Petit : lieu + horaire */
          <>
            <p className="truncate text-xs font-semibold text-gray-900 leading-tight">{rdv.lieu}</p>
            <p className="truncate text-[11px] text-gray-700 leading-tight">{timeRange}</p>
          </>
        ) : isCompact ? (
          /* Moyen : lieu + horaire + nom */
          <>
            <div className="flex items-start justify-between gap-1">
              <p className="truncate text-xs font-semibold text-gray-900 leading-tight">{rdv.lieu}</p>
              {absStyle && absLabel && (
                <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none shadow-sm ${absStyle}`}>
                  {absLabel}
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-gray-700 leading-tight">{timeRange}</p>
            <p className="truncate text-[11px] font-medium text-gray-800 leading-tight mt-0.5">{rdv.nom}</p>
          </>
        ) : (
          /* Grand : tout affiché */
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-gray-900">{rdv.lieu}</p>
              {absStyle && absLabel && (
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${absStyle}`}>
                  {absLabel}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-gray-700">{timeRange}</p>
            <div className="mt-1.5 space-y-0.5">
              <p className="truncate text-xs font-medium text-gray-800">{rdv.nom}</p>
              {teacherLabel && <p className="truncate text-xs text-gray-700">{teacherLabel}</p>}
              {rdv.eleves && <p className="truncate text-xs text-gray-700">{rdv.eleves.prenom} {rdv.eleves.nom}</p>}
            </div>
          </>
        )}
      </div>

      {/* Tooltip au survol — toujours complet, positionné en dessous si carte haute dans la grille */}
      <div
        className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden w-52 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl group-hover:block"
        style={{ minWidth: '180px' }}
      >
        {/* Barre de couleur */}
        <div className="mb-2 h-1.5 w-10 rounded-full" style={{ backgroundColor: rdv.couleur }} />
        <div className="space-y-1 text-xs">
          {tooltipLines.map((line, i) => (
            <p key={i} className={i === 0 ? 'font-semibold text-slate-900' : 'text-slate-600'}>
              {line}
            </p>
          ))}
        </div>
        {/* Petite flèche */}
        <div className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 border-l border-t border-slate-200 bg-white" />
      </div>
    </div>
  );
}
