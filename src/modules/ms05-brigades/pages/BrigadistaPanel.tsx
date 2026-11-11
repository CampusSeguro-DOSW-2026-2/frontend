import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventSummary } from '../../ms06-drills/types';
import { formatDate, scopeLabel } from '../../ms06-drills/utils/labels';
import IncidentesEvento from '../components/IncidentesEvento';
import { brigadesApi } from '../services/brigades';
import type { Asignacion, EstadoBrigadista } from '../types';
import '../../ms06-drills/styles/events.css';

/**
 * RF-BEI-03 y RF-BEI-06: panel de responsabilidades del brigadista. Activa o desactiva su disponibilidad,
 * muestra el evento en ejecución con su zona y da acceso a elegir zona y reportar incidentes.
 */
export default function BrigadistaPanel({ session }: { session: Session }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [estado, setEstado] = useState<EstadoBrigadista | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ev, as] = await Promise.allSettled([eventsApi.active(session), brigadesApi.misAsignaciones(session)]);
    if (ev.status === 'fulfilled') setEvents(ev.value);
    if (as.status === 'fulfilled') setAsignaciones(as.value);
    const failed = [ev, as].find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    setError(failed ? errorMessage(failed.reason) : '');
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const cambiarEstado = async (nuevo: EstadoBrigadista) => {
    setBusy(true);
    setNotice('');
    try {
      const res = await brigadesApi.cambiarEstado(session, nuevo);
      setEstado(res.estado);
      setNotice(res.estado === 'ACTIVO' ? 'Quedaste disponible para recibir asignaciones e incidentes.' : 'Quedaste no disponible.');
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const zonaDe = (eventId: string) => asignaciones.find((a) => a.eventoId === eventId && a.estado === 'VIGENTE');

  return (
    <>
      <header className="ev-head">
        <div>
          <span className="badge" style={{ background: 'var(--amber)', color: '#fff' }}>BRIGADISTA</span>
          <h1 style={{ marginTop: 10 }}>Panel de responsabilidades</h1>
          <p>Tu disponibilidad, tu zona en el evento y los incidentes que te corresponden.</p>
        </div>
        <div className="hbtns" role="group" aria-label="Mi disponibilidad">
          <button type="button" className="btn light" disabled={busy} aria-pressed={estado === 'ACTIVO'} onClick={() => cambiarEstado('ACTIVO')}>
            {estado === 'ACTIVO' ? '✓ Disponible' : 'Estoy disponible'}
          </button>
          <button type="button" className="btn ghost" disabled={busy} aria-pressed={estado === 'INACTIVO'} onClick={() => cambiarEstado('INACTIVO')}>
            {estado === 'INACTIVO' ? '✓ No disponible' : 'No disponible'}
          </button>
        </div>
      </header>
      <main className="ev-main">
        {notice && <p className="notice" role="status">{notice}</p>}
        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={load}>Reintentar</button></p>}
        {loading && <p className="notice" role="status">Cargando…</p>}

        {!loading && events.length === 0 && (
          <div className="ev-empty">No hay un evento en ejecución. Cuando inicie uno, aquí verás tu zona y podrás reportar incidentes.</div>
        )}

        {events.map((ev) => {
          const zona = zonaDe(ev.id);
          return (
            <section key={ev.id} className="ev-card" style={{ borderColor: 'var(--red)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <span className="st IN_PROGRESS">● En ejecución</span>
                  <h2 style={{ marginTop: 8 }}>{ev.name}</h2>
                  <span className="help">Inició {formatDate(ev.startedAt)}</span>
                </div>
                <a className="btn red" href={`#/brigadista/reportar/${ev.id}`}>Reportar incidente</a>
              </div>
              <div className="ev-zone">
                <span>Mi zona</span>
                {zona
                  ? <b>{scopeLabel(zona.ubicacionId)}</b>
                  : <a className="plink" href={`#/brigadista/zona/${ev.id}`}>Elegir zona →</a>}
              </div>
              {zona && <span className="help">Para cambiar de zona, pídeselo al coordinador o al organizador (solo ellos reasignan).</span>}
            </section>
          );
        })}

        {events.map((ev) => (
          <section key={`inc-${ev.id}`} className="ev-card">
            <h2>Mis incidentes · {ev.name}</h2>
            <p className="help">Los que reportaste, los que tienes asignados y los de tu zona. Inicia la atención y márcalos como resueltos.</p>
            <IncidentesEvento session={session} eventoId={ev.id} modo="brigadista" />
          </section>
        ))}
      </main>
    </>
  );
}
