import { SelectorEvento } from '../../../shared/components/SelectorEvento';
import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { confirmar } from '../../../shared/services/feedback';
import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import SelectorZonaEvento from '../components/SelectorZonaEvento';
import { brigadesApi } from '../services/brigades';
import type { Autoasignacion, AutoasignacionEvento } from '../types';
import { nombreUbicacion } from '../utils/ubicaciones';
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
  const { catalog } = useScopeCatalog();

  // MS05 guarda solo el id de cada edificio del evento; el nombre sale del catálogo vivo de MS02.
  const edificios = useMemo(
    () => (actual?.evento.edificios ?? []).map((e) => ({
      ...e,
      nombre: nombreUbicacion(e.ubicacionId, e.nombre, catalog),
    })),
    [actual, catalog],
  );
  const miEdificio = nombreUbicacion(actual?.ubicacionId, actual?.nombreUbicacion, catalog);

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

  const quitar = async () => {
    if (!actual?.ubicacionId) return;
    if (!(await confirmar({
      titulo: `¿Quitar su asignación de ${miEdificio || 'su edificio'}?`,
      texto: 'Dejará de apoyar en ese edificio. Puede elegir otro cuando quiera.',
      accion: 'Quitar mi asignación',
      peligro: true,
    }))) return;
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
          <p>Elija en el mapa el edificio donde va a apoyar durante el evento.</p>
        </div>
      </header>
      <main className="ev-main">
        {!data && !error && <Cargando texto="Cargando…" />}
        {error && <Mensaje tono="error" onReintentar={cargar}>{error}</Mensaje>}
        {notice && <Mensaje tono="exito">{notice}</Mensaje>}

        {data && data.eventos.length === 0 && (
          <EstadoVacio titulo="No hay eventos programados ni en ejecución">Cuando se programe uno, aquí podrá elegir su edificio.</EstadoVacio>
        )}

        {data && (
          <SelectorEvento valor={eventoId}
            eventos={data.eventos.map(({ evento: e }) => ({ id: e.eventoId, nombre: e.nombre, simulacro: e.simulacro, enCurso: e.estado === 'EN_EJECUCION' }))}
            onElegir={(id) => { setEventoId(id); setNotice(''); }} />
        )}

        {data && actual && (
          <div className="aa-layout">
            <section aria-label="Mapa del campus">
              <SelectorZonaEvento
                session={session}
                eventoId={actual.evento.eventoId}
                edificios={edificios}
                miUbicacionId={actual.ubicacionId}
                activo={!!activo}
                onAsignado={async (nombre) => { await cargar(); setNotice(`Quedó asignado a ${nombre}.`); }}
              />
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
                    <button type="button" className="btn red" disabled={busy} onClick={activarse}>{busy ? 'Activando…' : 'Estoy disponible'}</button>
                    <p className="aa-hint">Para elegir un edificio, primero marque que está disponible.</p>
                  </>
                )}
                {activo && (
                  <div className="ev-zone">
                    <span>Mi edificio</span>
                    <b>{miEdificio || 'Sin asignar'}</b>
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

    </>
  );
}
