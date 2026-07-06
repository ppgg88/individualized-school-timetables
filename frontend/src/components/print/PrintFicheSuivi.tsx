import { addDays, addMinutes, format, parseISO, startOfISOWeek } from 'date-fns';
import type { Eleve, Rdv } from '../../types';

interface Props {
  eleve: Eleve;
  rdvList: Rdv[];
  week: number;
  year: number;
  isFirst?: boolean;
}

export function PrintFicheSuivi({ eleve, rdvList, week, year, isFirst = false }: Props) {
  const weekStart = startOfISOWeek(addDays(new Date(year, 0, 4), (week - 1) * 7));
  const weekEnd = addDays(weekStart, 4);

  // Trier les RDV par date
  const sorted = [...rdvList].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  // Diviser en pages de 11 lignes max
  const chunkSize = 11;
  const chunks: Rdv[][] = [];
  for (let i = 0; i < sorted.length; i += chunkSize) {
    chunks.push(sorted.slice(i, i + chunkSize));
  }
  if (chunks.length === 0) chunks.push([]);

  return (
    <>
      {chunks.map((chunk, pageIdx) => (
        <div key={pageIdx} className="print-page" style={{ pageBreakBefore: isFirst && pageIdx === 0 ? 'auto' : 'always' }}>
          {/* En-tête */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <img src="/roville-logo.png" alt="École de ROVILLE" style={{ height: '78px', width: 'auto', marginRight: '10px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2FC900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Dispositif d'Individualisation — S{week}
                {chunks.length > 1 ? ` (${pageIdx + 1}/${chunks.length})` : ''}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', backgroundColor: '#2FC901', color: '#fff', padding: '2px 8px', marginTop: '3px', display: 'inline-block' }}>
                Document de suivi — Accompagnement
              </div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '20px' }}>
                <span style={headerCellStyle}>Nom : {eleve.nom}</span>
                <span style={headerCellStyle}>Prénom : {eleve.prenom}</span>
                {eleve.classe && <span style={headerCellStyle}>Classe : {eleve.classe}</span>}
              </div>
              <div style={{ fontSize: '11px', marginTop: '4px', color: '#444' }}>
                Semaine n°{week} · du {format(weekStart, 'dd/MM/yyyy')} au {format(weekEnd, 'dd/MM/yyyy')}
              </div>
            </div>
            <div style={{ fontSize: '9px', color: '#666', textAlign: 'right', marginLeft: '12px' }}>
              ROVILLE<br />EDT Individualisation
            </div>
          </div>

          {/* Tableau de suivi */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '21%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={suiviThStyle}>Date · Heure</th>
                <th style={suiviThStyle}>Points abordés / Travail réalisé</th>
                <th style={suiviThStyle}>Ressenti<br />apprenant</th>
                <th style={suiviThStyle}>Signature<br />apprenant</th>
                <th style={suiviThStyle}>Accompagnant<br />(nom et signature)</th>
              </tr>
            </thead>
            <tbody>
              {chunk.map((rdv) => {
                const start = parseISO(rdv.date);
                const end = addMinutes(start, rdv.durre);
                const prof = rdv.prof;
                const dayNames = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
                const dayName = dayNames[start.getDay() === 0 ? 7 : start.getDay()];
                return (
                  <tr key={rdv.id} style={{ height: '38px' }}>
                    {/* Date - Heure */}
                    <td style={{ ...suiviTdStyle, backgroundColor: `${rdv.couleur}80` }}>
                      <div style={{ fontWeight: 'bold', fontSize: '9px' }}>{dayName} {format(start, 'dd/MM')}</div>
                      <div style={{ fontSize: '8px' }}>{format(start, 'HH:mm')} – {format(end, 'HH:mm')}</div>
                      <div style={{ fontSize: '7px', marginTop: '1px' }}>{rdv.lieu}</div>
                    </td>
                    {/* Points abordés — vide à remplir */}
                    <td style={suiviTdStyle} />
                    {/* Ressenti apprenant */}
                    <td style={{ ...suiviTdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', fontSize: '14px' }}>
                        <span title="Très bien">😊</span>
                        <span title="Bien">🙂</span>
                        <span title="Neutre">😐</span>
                        <span title="Difficile">😕</span>
                      </div>
                    </td>
                    {/* Signature apprenant */}
                    <td style={suiviTdStyle} />
                    {/* Accompagnant */}
                    <td style={{ ...suiviTdStyle, fontSize: '8px', color: '#555', verticalAlign: 'top', paddingTop: '3px' }}>
                      {prof ? `${prof.prenom[0]}. ${prof.nom}` : ''}
                    </td>
                  </tr>
                );
              })}
              {/* Lignes vides pour remplir si peu de RDV */}
              {chunk.length < 5 &&
                Array.from({ length: 5 - chunk.length }).map((_, i) => (
                  <tr key={`empty-${i}`} style={{ height: '38px' }}>
                    <td style={suiviTdStyle} />
                    <td style={suiviTdStyle} />
                    <td style={{ ...suiviTdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', fontSize: '14px' }}>
                        <span>😊</span><span>🙂</span><span>😐</span><span>😕</span>
                      </div>
                    </td>
                    <td style={suiviTdStyle} />
                    <td style={suiviTdStyle} />
                  </tr>
                ))
              }
            </tbody>
          </table>

          {/* Pied de page */}
          <div style={{ marginTop: '8px', borderTop: '1px solid #ccc', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#888' }}>
            <span>Document généré le {format(new Date(), 'dd/MM/yyyy')}</span>
            <span>Dispositif d'Individualisation · Ecole de ROVILLE</span>
          </div>
        </div>
      ))}
    </>
  );
}

const headerCellStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 'bold',
  borderBottom: '1px solid #333',
  paddingBottom: '1px',
  minWidth: '110px',
};

const suiviThStyle: React.CSSProperties = {
  border: '1px solid #999',
  padding: '4px 3px',
  backgroundColor: '#2FC901',
  color: '#fff',
  fontWeight: 'bold',
  textAlign: 'center',
  fontSize: '9px',
  lineHeight: '1.3',
};

const suiviTdStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  padding: '2px 4px',
  verticalAlign: 'middle',
};
