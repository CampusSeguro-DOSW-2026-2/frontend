import { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '../../../shared/hooks/useAutoRefresh';
import { Info } from '../../../shared/components/Icons';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventSummary } from '../../ms06-drills/types';
import { formatDate, scopeLabelIn } from '../../ms06-drills/utils/labels';
import { brigadesApi } from '../services/brigades';
import type { IncidenteResumen } from '../types';
import { estadoIncidente, prioridadDe } from '../utils/incidentes';
import '../styles/respuesta.css';

interface Grupo { evento: EventSummary; incidentes: IncidenteResumen[]; error: string }

/**
 * "Mis incidentes" (ms05:incident:manage_own): las solicitudes que el usuario reportó en los eventos en ejecución.
 * MS05 filtra por el usuario autenticado con soloPropios=true.
 */
export default function MisIncidentes({ session }: { session: Session }) {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [error, setError] = useState('');
  const { catalog } = useScopeCatalog();

  const load = useCallback(async () => {
    setError('');
    try {
      const eventos = await eventsApi.active(session);
      const res = await Promise.allSettled(eventos.map((ev) => brigadesApi.misIncidentes(session, ev.id)));
      setGrupos(eventos.map((evento, i) => {
        const r = res[i];
        return r.status === 'fulfilled'
          ? { evento, incidentes: r.value.contenido ?? [], error: '' }
          : { evento, incidentes: [], error: errorMessage(r.reason) };
      }));
    } catch (err) {
      setError(errorMessage(err));
      setGrupos([]);
    }
  }, [session]);

  // Se actualiza sola: la persona ve cuando la brigada toma y resuelve su solicitud
  const tick = useAutoRefresh();
  useEffect(() => { void load(); }, [load, tick]);

  return (
    <>
      <PageHeader badge="INCIDENTES" title="Mis incidentes" subtitle="Revise el estado de las solicitudes de ayuda que envió." />
      <main className="rs-main">
        <a className="rs-back" href="#/checkin">← Volver al evento</a>
        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={() => void load()}>Reintentar</button></p>}
        {grupos === null && <p className="notice" role="status">Cargando…</p>}
        {grupos?.length === 0 && !error && <div className="rs-card rs-empty">No hay un evento en ejecución.</div>}
        {grupos?.map(({ evento, incidentes, error: err }) => (
          <section key={evento.id} className="rs-evento">
            <div style={{ padding: '16px 20px' }}>
              <h2 className="title sm22" style={{ fontSize: 18 }}>{evento.name}</h2>
              <small className="rs-sub">Inició {formatDate(evento.startedAt)}</small>
            </div>
            {err && <p className="notice err" role="alert" style={{ margin: '0 20px 16px' }}>{err}</p>}
            {!err && incidentes.length === 0 && <div className="rs-empty">No ha enviado solicitudes en este evento. <a className="plink" href="#/ayuda">Solicitar ayuda</a></div>}
            {incidentes.length > 0 && (
              <table className="rs-table">
                <thead><tr><th>Prioridad</th><th>Ubicación</th><th>Reportado</th><th>Estado</th></tr></thead>
                <tbody>
                  {incidentes.map((i) => {
                    const p = prioridadDe(i.prioridad);
                    const st = estadoIncidente(i.estado);
                    return (
                      <tr key={i.incidenteId}>
                        <td><span className={`rs-prio ${p.codigo}`}>{p.label}</span></td>
                        <td className="rs-loc">{scopeLabelIn(i.zonaId, catalog)}</td>
                        <td className="rs-rep">{formatDate(i.reportadoEn)}</td>
                        <td><span className={`rs-st ${st.clase}`}>{st.texto}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        ))}
        <p className="rs-info"><Info /> Si su situación cambia, envíe una nueva solicitud desde «Necesito ayuda». La brigada actualiza el estado a medida que lo atiende.</p>
      </main>
    </>
  );
}
