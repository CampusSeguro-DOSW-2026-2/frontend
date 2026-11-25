import { useCallback, useEffect, useState } from 'react';
import type { Session } from '../../../shared/types';
import ErrorNotice from '../components/ErrorNotice';
import { eventName, multiEventHref, useEventNames } from '../hooks/useEventNames';
import { analyticsApi } from '../services/analytics';
import type { ComparisonChange, ComparisonRow } from '../types';
import { KIND_LABEL, formatBogota, formatCount, formatDuration, formatPercent, formatSeconds } from '../utils/format';
import '../../ms06-drills/styles/events.css';
import '../styles/analytics.css';

type Metric = keyof ComparisonChange;

/** Columnas que tienen cambio frente al evento anterior. En los tiempos, bajar es mejorar. */
const METRICS: { key: Metric; label: string; time: boolean }[] = [
  { key: 'porcentajeParticipacion', label: 'Participación', time: false },
  { key: 'porcentajeConfirmacion', label: 'Confirmación de alertas', time: false },
  { key: 'hastaCheckinSegundos', label: 'Hasta el check-in', time: true },
  { key: 'evacuacionSegundos', label: 'Evacuación', time: true },
  { key: 'hastaPrimeraAtencionSegundos', label: 'Hasta la primera atención', time: true },
];

/** "+2,5 pts" o "−1 min 5 s", en verde si mejoró y en rojo si empeoró. */
function Change({ value, time }: { value: number | null; time: boolean }) {
  if (value == null) return null;
  if (value === 0) return <div className="an-chg">Sin cambio</div>;
  const better = time ? value < 0 : value > 0;
  const sign = value > 0 ? '+' : '−';
  const text = time ? formatDuration(Math.abs(value)) : `${Math.abs(value).toLocaleString('es-CO', { maximumFractionDigits: 1 })} pts`;
  return <div className={`an-chg ${better ? 'up' : 'down'}`} title={better ? 'Mejoró frente al evento anterior' : 'Empeoró frente al evento anterior'}>{sign}{text} vs. anterior</div>;
}

const metricValue = (row: ComparisonRow, m: { key: Metric; time: boolean }) =>
  (m.time ? formatSeconds(row[m.key]) : formatPercent(row[m.key]));

/**
 * Comparación de 2 a 10 eventos del mismo tipo (#/indicadores/comparar/{ids}): indicadores principales lado a lado,
 * del inicio más antiguo al más reciente, con el cambio frente al evento anterior.
 */
export default function Comparacion({ session, ids }: { session: Session; ids: string[] }) {
  const names = useEventNames(session, ids);
  const [rows, setRows] = useState<ComparisonRow[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const key = ids.join(',');
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await analyticsApi.compare(session, key.split(',')));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // La lista llega nueva en cada render: se compara por su texto para no volver a consultar sin cambios
  }, [session, key]);

  useEffect(() => { load(); }, [load]);

  const kindKey = rows?.[0]?.tipoEvento;

  return (
    <>
      <header className="ev-head">
        <div>
          <a className="plink" href="#/indicadores">← Volver a indicadores</a>
          <h1>Comparación de eventos</h1>
          <p>{[kindKey ? `${KIND_LABEL[kindKey]}s` : null, `${ids.length} eventos`, 'del más antiguo al más reciente'].filter(Boolean).join(' · ')}</p>
        </div>
        <a className="btn white" href={multiEventHref('ubicaciones', ids)}>Ver por ubicación</a>
      </header>
      <main className="ev-main">
        {loading && <p className="notice" role="status">Calculando la comparación…</p>}
        {!loading && error !== null && <ErrorNotice error={error} onRetry={load} />}
        {!loading && error === null && rows && rows.length === 0 && <div className="ev-empty">No hay datos para comparar estos eventos.</div>}
        {!loading && error === null && rows && rows.length > 0 && (
          <>
            <table className="ev-table an-table">
              <thead>
                <tr><th>Evento</th><th>Participantes</th>{METRICS.map((m) => <th key={m.key}>{m.label}</th>)}<th>Asistencia</th><th>Incidentes</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.eventoId}>
                    <td>
                      <a className="t" href={`#/indicadores/${r.eventoId}`}>{eventName(names, r.eventoId)}</a>
                      <div className="s">{r.inicioEvento ? `Inició ${formatBogota(r.inicioEvento)}` : 'Sin inicio registrado'}</div>
                    </td>
                    <td>{formatCount(r.participantes)}</td>
                    {METRICS.map((m) => (
                      <td key={m.key}><b>{metricValue(r, m)}</b>{r.cambio && <Change value={r.cambio[m.key]} time={m.time} />}</td>
                    ))}
                    <td>{formatPercent(r.porcentajeAsistencia)}</td>
                    <td>{formatCount(r.incidentes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="help">Los porcentajes cambian en puntos porcentuales. En los tiempos, un valor menor es mejor. "—" indica que no hubo datos para calcularlo. Fechas en hora de Bogotá.</p>
          </>
        )}
      </main>
    </>
  );
}
