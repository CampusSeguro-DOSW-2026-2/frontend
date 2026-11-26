import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../../../shared/hooks/useAutoRefresh';
import { PERMISSION } from '../../../shared/permissions';
import { errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventSummary } from '../../ms06-drills/types';
import { formatDate } from '../../ms06-drills/utils/labels';
import IncidentesEvento from '../components/IncidentesEvento';
import SelectorZonaEvento from '../components/SelectorZonaEvento';
import { brigadesApi } from '../services/brigades';
import type { Autoasignacion, AutoasignacionEvento } from '../types';
import { nombreUbicacion } from '../utils/ubicaciones';
import '../../ms06-drills/styles/events.css';
import '../styles/brigadas.css';

const ESTADO_EVENTO: Record<string, string> = { PROGRAMADO: 'Programado', EN_EJECUCION: 'En ejecución' };

/**
 * RF-BEI-03 y RF-BEI-06: panel de responsabilidades del brigadista. Marca su disponibilidad (activo o finalizado),
 * elige el evento que va a atender, escoge su zona en ese evento y atiende los incidentes de la zona.
 */
export default function BrigadistaPanel({ session }: { session: Session }) {
  const [data, setData] = useState<Autoasignacion | null>(null);
  const [activos, setActivos] = useState<EventSummary[]>([]);
  const [eventoId, setEventoId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editandoZona, setEditandoZona] = useState(false);
  const { catalog } = useScopeCatalog();
  const canRegisterAssistance = hasPermission(session, PERMISSION.MS05_ASSISTANCE_REGISTER);

  const cargar = useCallback(async () => {
    const [ev, as] = await Promise.allSettled([eventsApi.active(session), brigadesApi.autoasignacion(session)]);
    if (ev.status === 'fulfilled') setActivos(ev.value);
    if (as.status === 'fulfilled') {
      setData(as.value);
      setEventoId((actual) => (as.value.eventos.some((e) => e.evento.eventoId === actual)
        ? actual
        : as.value.eventos[0]?.evento.eventoId ?? ''));
    }
    const failed = [ev, as].find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    setError(failed ? errorMessage(failed.reason) : '');
  }, [session]);

  useEffect(() => { cargar().finally(() => setLoading(false)); }, [cargar]);
  // Se actualiza solo: nuevos incidentes de su zona y cambios del evento
  const tick = useAutoRefresh();
  useEffect(() => { if (tick) void cargar(); }, [tick, cargar]);

  const eventos = data?.eventos ?? [];
  const actual: AutoasignacionEvento | undefined = eventos.find((e) => e.evento.eventoId === eventoId) ?? eventos[0];
  const activo = data?.estado === 'ACTIVO';
  const inicio = activos.find((e) => e.id === actual?.evento.eventoId)?.startedAt;

  // MS05 guarda solo el id de la ubicación; el nombre sale del catálogo vivo de MS02.
  const edificios = useMemo(
    () => (actual?.evento.edificios ?? []).map((e) => ({
      ...e,
      nombre: nombreUbicacion(e.ubicacionId, e.nombre, catalog),
    })),
    [actual, catalog],
  );
  const miZona = nombreUbicacion(actual?.ubicacionId, actual?.nombreUbicacion, catalog);

  const disponible = async () => {
    setBusy(true);
    setNotice('');
    try {
      await brigadesApi.cambiarEstado(session, 'ACTIVO');
      await cargar();
      setNotice('Quedó disponible. Ahora elija el evento y su zona para atender.');
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // "Finalizar": el brigadista deja de estar disponible (queda INACTIVO) hasta que se active de nuevo.
  const finalizar = async () => {
    if (!window.confirm('¿Finalizar su turno? Quedará como no disponible y no recibirá nuevas asignaciones.')) return;
    setBusy(true);
    setNotice('');
    try {
      await brigadesApi.cambiarEstado(session, 'INACTIVO');
      await cargar();
      setEditandoZona(false);
      setNotice('Finalizó su turno: quedó como no disponible.');
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const quitarZona = async () => {
    if (!actual?.ubicacionId) return;
    if (!window.confirm(`¿Quitar su asignación de ${miZona || 'su edificio'}?`)) return;
    setBusy(true);
    setNotice('');
    try {
      await brigadesApi.quitarEdificio(session, actual.evento.eventoId);
      await cargar();
      setEditandoZona(false);
      setNotice('Quitó su asignación. Puede elegir otro edificio cuando quiera.');
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="ev-head">
        <div>
          <span className="badge aviso">BRIGADISTA</span>
          <h1 style={{ marginTop: 10 }}>Panel de responsabilidades</h1>
          <p>Elija el evento, su zona y atienda los incidentes que le corresponden.</p>
        </div>
        <div className="hbtns" role="group" aria-label="Mi disponibilidad">
          {activo
            ? <button type="button" className="btn ghost" disabled={busy} onClick={() => void finalizar()}>{busy ? 'Finalizando…' : 'Finalizar'}</button>
            : <button type="button" className="btn light" disabled={busy} onClick={() => void disponible()}>{busy ? 'Activando…' : 'Estoy disponible'}</button>}
        </div>
      </header>
      <main className="ev-main">
        {notice && <p className="notice" role="status">{notice}</p>}
        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={() => void cargar()}>Reintentar</button></p>}
        {loading && <p className="notice" role="status">Cargando…</p>}

        {!loading && eventos.length === 0 && (
          <div className="ev-empty">
            No hay eventos programados ni en ejecución. Cuando se programe uno, aquí podrá elegir su zona y atender incidentes.
          </div>
        )}

        {eventos.length > 1 && (
          <div className="ev-tabs" role="group" aria-label="Evento">
            {eventos.map((e) => (
              <button key={e.evento.eventoId} type="button" className="ev-tab" aria-pressed={e.evento.eventoId === actual?.evento.eventoId}
                onClick={() => { setEventoId(e.evento.eventoId); setEditandoZona(false); setNotice(''); }}>
                {e.evento.nombre}{e.evento.simulacro ? ' · Simulacro' : ''}
              </button>
            ))}
          </div>
        )}

        {actual && (
          <section className="ev-card">
            <div>
              <span className={`st ${actual.evento.estado === 'EN_EJECUCION' ? 'IN_PROGRESS' : 'SCHEDULED'}`}>
                {ESTADO_EVENTO[actual.evento.estado] ?? actual.evento.estado}
              </span>
              <h2 style={{ marginTop: 8 }}>{actual.evento.nombre}</h2>
              <span className="help">
                {actual.evento.simulacro ? 'Simulacro' : 'Evento real'}{inicio ? ` · Inició ${formatDate(inicio)}` : ''}
              </span>
            </div>
          </section>
        )}

        {actual && !activo && (
          <p className="notice" role="status">Actívese para elegir su zona y atender incidentes.</p>
        )}

        {actual && activo && (
          <section className="ev-card">
            <div className="ev-zone">
              <span>Mi zona</span>
              <b>{miZona || 'Sin asignar'}</b>
            </div>
            {actual.ubicacionId && !editandoZona && (
              <>
                <p className="help">Puede cambiar de edificio o quitar su asignación, salvo que sea el único brigadista del suyo.</p>
                <div className="row2" style={{ justifyContent: 'flex-start' }}>
                  <button type="button" className="btn white" disabled={busy} onClick={() => setEditandoZona(true)}>Cambiar edificio</button>
                  <button type="button" className="btn ghost" disabled={busy} onClick={() => void quitarZona()}>Quitar asignación</button>
                </div>
              </>
            )}
            {(!actual.ubicacionId || editandoZona) && (
              <>
                <p className="help">Toque en el mapa el edificio donde va a apoyar durante el evento.</p>
                <SelectorZonaEvento
                  session={session}
                  eventoId={actual.evento.eventoId}
                  edificios={edificios}
                  miUbicacionId={actual.ubicacionId}
                  activo
                  onAsignado={async (nombre) => {
                    await cargar();
                    setEditandoZona(false);
                    setNotice(`Quedó asignado a ${nombre}.`);
                  }}
                />
                {editandoZona && (
                  <button type="button" className="btn ghost" disabled={busy} onClick={() => setEditandoZona(false)}>Cancelar cambio</button>
                )}
              </>
            )}
          </section>
        )}

        {actual && (
          <section className="ev-card">
            <h2>Incidentes · {actual.evento.nombre}</h2>
            {actual.evento.estado === 'EN_EJECUCION'
              ? (
                  <>
                    <p className="help">Los que reportó, los que tiene asignados y los de su zona. Abra uno para iniciar la atención y registrar el resultado.</p>
                    {canRegisterAssistance && (
                      <a className="btn red" style={{ alignSelf: 'flex-start' }} href={`#/brigadista/reportar/${actual.evento.eventoId}`}>Reportar incidente</a>
                    )}
                    <IncidentesEvento session={session} eventoId={actual.evento.eventoId} modo="brigadista" refresco={tick} />
                  </>
                )
              : <div className="ev-empty">El evento aún no está en ejecución. Cuando inicie, aquí verá los incidentes de su zona.</div>}
          </section>
        )}
      </main>
    </>
  );
}
