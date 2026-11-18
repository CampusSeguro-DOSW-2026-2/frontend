import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import MapaCampus from '../components/MapaCampus';
import { brigadesApi } from '../services/brigades';
import type { Autoasignacion, AutoasignacionEvento, EdificioEvento } from '../types';
import '../../ms06-drills/styles/events.css';
import '../styles/brigadas.css';

const ESTADO_EVENTO: Record<string, string> = { PROGRAMADO: 'Programado', EN_EJECUCION: 'En ejecución' };

/**
 * RF-BEI-01 (opción 2): auto asignación del brigadista. Al programar un evento (simulacro o real) el brigadista
 * entra aquí, se activa si está inactivo y elige en el mapa del campus el edificio donde va a apoyar. Puede
 * cambiarse de edificio o quitar su asignación, salvo que sea el único brigadista del edificio.
 */
export default function AutoAsignacion({ session, eventId }: { session: Session; eventId?: string }) {
  const [data, setData] = useState<Autoasignacion | null>(null);
  const [eventoId, setEventoId] = useState(eventId ?? '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmar, setConfirmar] = useState<EdificioEvento | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await brigadesApi.autoasignacion(session);
      setData(res);
      setError('');
      setEventoId((actual) => (res.eventos.some((e) => e.evento.eventoId === actual) ? actual : res.eventos[0]?.evento.eventoId ?? ''));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [session]);

  useEffect(() => { cargar(); }, [cargar]);

  const actual: AutoasignacionEvento | undefined = data?.eventos.find((e) => e.evento.eventoId === eventoId);
  const activo = data?.estado === 'ACTIVO';

  const activarse = async () => {
    setBusy(true);
    setNotice('');
    try {
      await brigadesApi.cambiarEstado(session, 'ACTIVO');
      await cargar();
      setNotice('Quedó activo. Ahora elija en el mapa el edificio donde va a apoyar.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const elegir = (edificio: EdificioEvento) => {
    setNotice('');
    if (!activo) { setNotice('Para asignarse a un edificio primero debe activarse.'); return; }
    if (edificio.ubicacionId === actual?.ubicacionId) { setNotice(`Ya está asignado a ${edificio.nombre}.`); return; }
    setConfirmar(edificio);
  };

  const asignarse = async () => {
    if (!confirmar || !actual) return;
    setBusy(true);
    setError('');
    try {
      const res = await brigadesApi.elegirEdificio(session, actual.evento.eventoId, confirmar.ubicacionId);
      setConfirmar(null);
      await cargar();
      setNotice(`Quedó asignado a ${res.nombreUbicacion ?? confirmar.nombre}.`);
    } catch (err) {
      setConfirmar(null);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const quitar = async () => {
    if (!actual?.ubicacionId) return;
    if (!window.confirm(`¿Quitar su asignación de ${actual.nombreUbicacion ?? 'su edificio'}?`)) return;
    setBusy(true);
    setError('');
    try {
      await brigadesApi.quitarEdificio(session, actual.evento.eventoId);
      await cargar();
      setNotice('Quitó su asignación. Puede elegir otro edificio cuando quiera.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="ev-head">
        <div>
          <a className="back" href="#/brigadista">← Panel de responsabilidades</a>
          <h1>Auto asignación</h1>
          <p>¡Hola! Qué gusto que nos quiera ayudar. Elija en el mapa el edificio donde va a apoyar durante el evento.</p>
        </div>
      </header>
      <main className="ev-main">
        {!data && !error && <p className="notice" role="status">Cargando…</p>}
        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={cargar}>Reintentar</button></p>}
        {notice && <p className="notice" role="status">{notice}</p>}

        {data && data.eventos.length === 0 && (
          <div className="ev-empty">No hay eventos programados ni en ejecución. Cuando se programe uno, aquí podrá elegir su edificio.</div>
        )}

        {data && data.eventos.length > 1 && (
          <div className="ev-tabs" role="group" aria-label="Evento">
            {data.eventos.map((e) => (
              <button key={e.evento.eventoId} type="button" className="ev-tab" aria-pressed={e.evento.eventoId === eventoId}
                onClick={() => { setEventoId(e.evento.eventoId); setNotice(''); }}>
                {e.evento.nombre}{e.evento.simulacro ? ' · Simulacro' : ''}
              </button>
            ))}
          </div>
        )}

        {data && actual && (
          <div className="aa-layout">
            <section aria-label="Mapa del campus">
              {actual.evento.edificios.length === 0
                ? <div className="ev-empty">El evento todavía no tiene edificios registrados.</div>
                : <MapaCampus edificios={actual.evento.edificios} miUbicacionId={actual.ubicacionId} deshabilitado={!activo || busy} onElegir={elegir} />}
            </section>

            <aside className="aa-side">
              <section className="ev-card">
                <span className={`st ${actual.evento.estado === 'EN_EJECUCION' ? 'IN_PROGRESS' : 'SCHEDULED'}`} style={{ alignSelf: 'flex-start' }}>
                  {ESTADO_EVENTO[actual.evento.estado] ?? actual.evento.estado}
                </span>
                <h2>{actual.evento.nombre}</h2>
                <span className="help">{actual.evento.simulacro ? 'Simulacro' : 'Evento real'}</span>
              </section>

              <section className="ev-card">
                <p className="aa-state">Estado <span className={activo ? 'on' : 'off'}>{activo ? 'activo' : 'inactivo'}</span></p>
                {!activo && (
                  <>
                    <button type="button" className="btn red" disabled={busy} onClick={activarse}>{busy ? 'Activando…' : 'Activarse'}</button>
                    <p className="aa-hint">Por favor, para asignarse primero debe activarse.</p>
                  </>
                )}
                {activo && (
                  <div className="ev-zone">
                    <span>Mi edificio</span>
                    <b>{actual.nombreUbicacion ?? 'Sin asignar'}</b>
                  </div>
                )}
                {activo && !actual.ubicacionId && <p className="help">Toque un edificio en el mapa para asignarse.</p>}
                {activo && actual.ubicacionId && (
                  <>
                    <p className="help">Toque otro edificio en el mapa para cambiarse. Solo puede estar en un edificio.</p>
                    <button type="button" className="btn white" disabled={busy} onClick={quitar}>Quitar mi asignación</button>
                  </>
                )}
                <p className="help">Un edificio del evento no puede quedar sin brigadistas: si es el único en el suyo, no podrá cambiarse ni retirarse hasta que llegue otro.</p>
              </section>
            </aside>
          </div>
        )}
      </main>

      {confirmar && actual && (
        <div className="ev-modal-bg" role="presentation" onClick={() => setConfirmar(null)}>
          <div className="ev-modal" role="dialog" aria-modal="true" aria-labelledby="aa-confirmar" onClick={(e) => e.stopPropagation()}>
            <h2 id="aa-confirmar">{actual.ubicacionId ? 'Cambiar de edificio' : 'Asignarme a este edificio'}</h2>
            <p>
              {actual.ubicacionId
                ? <>Pasará de <b>{actual.nombreUbicacion}</b> a <b>{confirmar.nombre}</b>.</>
                : <>Quedará asignado a <b>{confirmar.nombre}</b> en {actual.evento.nombre}.</>}
            </p>
            <p className="help">{confirmar.brigadistasAsignados === 1 ? 'Hay 1 brigadista' : `Hay ${confirmar.brigadistasAsignados} brigadistas`} en este edificio.</p>
            <div className="row2">
              <button type="button" className="btn white" onClick={() => setConfirmar(null)} disabled={busy}>Cancelar</button>
              <button type="button" className="btn red" onClick={asignarse} disabled={busy}>{busy ? 'Guardando…' : 'Aceptar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
