import { addDays, format, parseISO, startOfISOWeek } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import type { Eleve, Prof, Rdv } from '../../types';
import { groupRdvBySlot } from '../../utils/rdvGroup';

const DAYS_FR   = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const DAY_START = 8;   // heure de début
const DAY_END   = 19;  // heure de fin
const HOURS     = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
const HOUR_H_MM = 13;  // hauteur d'une heure en mm
const GRID_H_MM = HOURS.length * HOUR_H_MM;

function topMm(rdv: Rdv): number {
  const d = parseISO(rdv.date);
  const startMin = (d.getHours() - DAY_START) * 60 + d.getMinutes();
  return (startMin / 60) * HOUR_H_MM;
}
function heightMm(rdv: Rdv): number {
  return Math.max((rdv.durre / 60) * HOUR_H_MM, 3); // min 3mm visible
}
function timeStr(totalMin: number): string {
  const h = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const m = String(totalMin % 60).padStart(2, '0');
  return `${h}:${m}`;
}

interface Props {
  entity: Eleve | Prof;
  /** Détermine le libellé, le lien QR (/eleve/:id ou /prof/:id) et l'affichage de la classe */
  entityType: 'eleve' | 'prof';
  rdvList: Rdv[];
  week: number;
  year: number;
  showQR: boolean;
  isFirst: boolean;
}

export function PrintSchedule({ entity, entityType, rdvList, week, year, showQR, isFirst }: Props) {
  const weekStart = startOfISOWeek(addDays(new Date(year, 0, 4), (week - 1) * 7));
  const weekEnd   = addDays(weekStart, 4);
  // Pour un formateur, le QR doit inclure son token afin de donner directement accès
  // à la déclaration d'absence (comme le lien formateur généré dans Paramètres).
  const profToken = entityType === 'prof' ? (entity as Prof).token : undefined;
  const entityUrl = `${window.location.origin}/${entityType}/${entity.id}${profToken ? `?key=${profToken}` : ''}`;
  const classe = entityType === 'eleve' ? (entity as Eleve).classe : undefined;
  const badgeLabel = entityType === 'eleve' ? 'Emploi du temps individuel' : 'Emploi du temps formateur';
  const qrCaption = entityType === 'eleve' ? 'EDT élève' : 'EDT formateur';

  // Pour un formateur, plusieurs élèves peuvent partager le même créneau : on les regroupe
  // pour n'afficher qu'une seule carte par créneau (sinon les cartes se superposent).
  const { representativeRdvs, groupSizes } = groupRdvBySlot(rdvList);
  const displayedRdv = entityType === 'prof' ? representativeRdvs : rdvList;

  // Regrouper les RDV par jour (0=lundi … 4=vendredi)
  const byDay: Rdv[][] = [[], [], [], [], []];
  for (const rdv of displayedRdv) {
    const d = parseISO(rdv.date);
    if (format(startOfISOWeek(d), 'yyyy-MM-dd') !== format(weekStart, 'yyyy-MM-dd')) continue;
    const dayIdx = (d.getDay() + 6) % 7;
    if (dayIdx >= 0 && dayIdx <= 4) byDay[dayIdx].push(rdv);
  }

  const TIME_COL = '36px';

  return (
    <div className="print-page" style={{ pageBreakBefore: isFirst ? 'auto' : 'always', fontFamily: 'Arial, sans-serif' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <img src="/roville-logo.png" alt="École de ROVILLE" style={{ height: '72px', width: 'auto', marginRight: '10px', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2FC900', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Dispositif d'Individualisation — Semaine {week}
          </div>
          <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#2FC901', color: '#fff', padding: '1px 8px', marginTop: '2px' }}>
            {badgeLabel}
          </div>
          <div style={{ marginTop: '5px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', borderBottom: '1px solid #555', paddingBottom: '1px' }}>Nom : <strong>{entity.nom}</strong></span>
            <span style={{ fontSize: '10px', borderBottom: '1px solid #555', paddingBottom: '1px' }}>Prénom : <strong>{entity.prenom}</strong></span>
            {classe && <span style={{ fontSize: '10px', borderBottom: '1px solid #555', paddingBottom: '1px' }}>Classe : <strong>{classe}</strong></span>}
          </div>
          <div style={{ fontSize: '9px', marginTop: '3px', color: '#555' }}>
            Semaine n°{week} · du {format(weekStart, 'dd/MM/yyyy')} au {format(weekEnd, 'dd/MM/yyyy')}
          </div>
        </div>
        {showQR && (
          <div style={{ marginLeft: '12px', flexShrink: 0, textAlign: 'center' }}>
            <QRCodeSVG value={entityUrl} size={65} level="M" />
            <div style={{ fontSize: '6px', color: '#888', marginTop: '2px' }}>{qrCaption}</div>
          </div>
        )}
      </div>

      {/* ── En-tête des colonnes (jours) ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #2FC901' }}>
        <div style={{ width: TIME_COL, flexShrink: 0, backgroundColor: '#e8e8e8', border: '1px solid #aaa', fontSize: '7px', fontWeight: 'bold', textAlign: 'center', padding: '2px 0' }}>
          Heure
        </div>
        {DAYS_FR.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderLeft: '1px solid #aaa',
              borderTop: '1px solid #aaa',
              borderRight: i === 4 ? '1px solid #aaa' : 'none',
              backgroundColor: '#2FC901',
              color: '#fff',
              textAlign: 'center',
              padding: '2px 0',
              fontSize: '9px',
              fontWeight: 'bold',
            }}
          >
            {d}<br />
            <span style={{ fontSize: '7px', fontWeight: 'normal' }}>{format(addDays(weekStart, i), 'dd/MM')}</span>
          </div>
        ))}
      </div>

      {/* ── Grille + cours ── */}
      <div style={{ display: 'flex' }}>

        {/* Colonne des heures */}
        <div style={{ width: TIME_COL, flexShrink: 0, position: 'relative', height: `${GRID_H_MM}mm`, border: '1px solid #aaa', borderTop: 'none', backgroundColor: '#f5f5f5' }}>
          {HOURS.map((h, i) => (
            <div
              key={h}
              style={{
                position: 'absolute',
                top: `${i * HOUR_H_MM}mm`,
                width: '100%',
                borderTop: i === 0 ? 'none' : '1px solid #999',
                fontSize: '7px',
                fontWeight: 'bold',
                textAlign: 'center',
                paddingTop: '1px',
                color: '#333',
                boxSizing: 'border-box',
              }}
            >
              {h}h
            </div>
          ))}
          {/* Borne finale 19h */}
          <div style={{ position: 'absolute', bottom: 0, width: '100%', borderTop: '1px solid #999', fontSize: '7px', fontWeight: 'bold', textAlign: 'center', paddingTop: '1px', color: '#333', boxSizing: 'border-box' }}>
            {DAY_END}h
          </div>
        </div>

        {/* Colonnes des jours */}
        {[0, 1, 2, 3, 4].map((dayIdx) => (
          <div
            key={dayIdx}
            style={{
              flex: 1,
              position: 'relative',
              height: `${GRID_H_MM}mm`,
              borderLeft: '1px solid #ccc',
              borderRight: dayIdx === 4 ? '1px solid #ccc' : 'none',
              borderBottom: '1px solid #999',
              overflow: 'hidden',
            }}
          >
            {/* Lignes d'heure */}
            {HOURS.map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: `${i * HOUR_H_MM}mm`,
                  left: 0,
                  right: 0,
                  borderTop: i === 0 ? 'none' : '1px solid #ddd',
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Cours */}
            {byDay[dayIdx].map((rdv) => {
              const t = topMm(rdv);
              const h = heightMm(rdv);
              const d = parseISO(rdv.date);
              const startMin = d.getHours() * 60 + d.getMinutes();
              const endMin   = startMin + rdv.durre;
              const groupSize = groupSizes.get(rdv.id) ?? 1;
              // Élève -> le formateur du cours ; Formateur -> l'élève (ou "N élèves" si créneau groupé)
              const counterpart = entityType === 'eleve'
                ? (rdv.prof ? `${rdv.prof.prenom[0]}. ${rdv.prof.nom}` : null)
                : groupSize > 1
                  ? `${groupSize} élèves`
                  : (rdv.eleves ? `${rdv.eleves.prenom} ${rdv.eleves.nom}` : null);

              return (
                <div
                  key={rdv.id}
                  style={{
                    position: 'absolute',
                    top: `${t}mm`,
                    height: `${h}mm`,
                    left: '1.5px',
                    right: '1.5px',
                    backgroundColor: rdv.couleur,
                    border: '1px solid rgba(0,0,0,0.3)',
                    borderRadius: '2px',
                    padding: '1px 3px',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    fontSize: '7px',
                    lineHeight: 1.2,
                    zIndex: 1,
                  }}
                >
                  <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rdv.lieu}</div>
                  <div style={{ color: '#111', whiteSpace: 'nowrap' }}>{timeStr(startMin)}–{timeStr(endMin)}</div>
                  {h > 6 && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rdv.nom}</div>}
                  {h > 9 && counterpart && <div style={{ color: '#333', whiteSpace: 'nowrap' }}>{counterpart}</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
