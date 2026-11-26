import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { Mensaje } from '../../../shared/components/Mensaje';
import { useCallback, useEffect, useState } from 'react';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { scopeLabelIn } from '../../ms06-drills/utils/labels';
import { eventName, multiEventHref, useEventNames } from '../hooks/useEventNames';
import { analyticsApi } from '../services/analytics';
import type { LocationRow } from '../types';
import { MIN_COMPARE } from '../types';
import { formatCount, formatSeconds } from '../utils/format';
import '../../ms06-drills/styles/events.css';
import '../styles/analytics.css';

const TYPE_LABEL: Record<string, string> = { EDIFICIO: 'Edificio', BUILDING: 'Edificio', ZONA_SEGURA: 'Zona', ZONA: 'Zona', ZONE: 'Zona' };
const typeLabel = (type: string) => TYPE_LABEL[type.toUpperCase()] ?? type;

/**
 * Análisis por ubicación de 1 a 10 eventos del mismo tipo (#/indicadores/ubicaciones/{ids}): incidentes,
 * solicitudes de asistencia y tiempo hasta la primera atención por edificio o zona, las más lentas primero.
 */
export default function Ubicaciones({ session, ids }: { session: Session; ids: string[] }) {
  const names = useEventNames(session, ids);
  const { catalog } = useScopeCatalog();
  const [rows, setRows] = useState<LocationRow[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const key = ids.join(',');
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await analyticsApi.locations(session, key.split(',')));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // La lista llega nueva en cada render: se compara por su texto para no volver a consultar sin cambios
  }, [session, key]);

  useEffect(() => { load(); }, [load]);

  const several = ids.length > 1;
  const subtitle = several ? `${ids.length} eventos` : eventName(names, ids[0]);

  return (
    <>
      <header className="ev-head">
        <div>
          <a className="plink" href="#/indicadores">← Volver a indicadores</a>
          <h1>Análisis por ubicación</h1>
          <p>{subtitle} · edificios y zonas, de la atención más lenta a la más rápida</p>
        </div>
        {ids.length >= MIN_COMPARE
          ? <a className="btn white" href={multiEventHref('comparar', ids)}>Comparar eventos</a>
          : <a className="btn white" href={`#/indicadores/${ids[0]}`}>Ver indicadores del evento</a>}
      </header>
      <main className="ev-main">
        {loading && <Mensaje tono="info">Calculando por ubicación…</Mensaje>}
        {!loading && error !== null && <Mensaje error={error} onReintentar={load} />}
        {!loading && error === null && rows && rows.length === 0 && (
          <EstadoVacio titulo={`No hay incidentes ni solicitudes de asistencia en ${several ? 'estos eventos' : 'este evento'}`} />
        )}
        {!loading && error === null && rows && rows.length > 0 && (
          <>
            <table className="ev-table an-table">
              <thead>
                <tr><th>Ubicación</th><th>Incidentes</th><th>Solicitudes de asistencia</th><th>Hasta la primera atención</th>{several && <th>Por evento</th>}</tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={`${l.ubicacionTipo}-${l.ubicacionId}`}>
                    <td><div className="t">{scopeLabelIn(l.ubicacionId, catalog)}</div><div className="s">{typeLabel(l.ubicacionTipo)}</div></td>
                    <td>{formatCount(l.incidentes)}</td>
                    <td>{formatCount(l.solicitudesAsistencia)}</td>
                    <td>
                      <b>{formatSeconds(l.hastaPrimeraAtencion.promedioSegundos)}</b>
                      <div className="s">{l.hastaPrimeraAtencion.muestras ? `${formatCount(l.hastaPrimeraAtencion.muestras)} atenciones` : 'Sin atenciones'}</div>
                    </td>
                    {several && (
                      <td>
                        <details>
                          <summary>{l.porEvento.length} {l.porEvento.length === 1 ? 'evento' : 'eventos'}</summary>
                          <div className="an-breakdown">
                            {l.porEvento.map((e) => (
                              <span key={e.eventoId}>
                                <span>{eventName(names, e.eventoId)}</span>
                                <b>{formatCount(e.incidentes)} inc. · {formatCount(e.solicitudesAsistencia)} sol. · {formatSeconds(e.promedioSegundos)}</b>
                              </span>
                            ))}
                          </div>
                        </details>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="help">El tiempo es el promedio desde que se reporta un incidente hasta que un brigadista inicia la atención. "—" indica que no hubo atenciones.</p>
          </>
        )}
      </main>
    </>
  );
}
