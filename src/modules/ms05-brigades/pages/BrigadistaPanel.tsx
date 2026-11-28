import { SelectorEvento } from '../../../shared/components/SelectorEvento';
import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { confirmar } from '../../../shared/services/feedback';
import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
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
  // Error de una acción (activarse, finalizar, quitar la zona); el de la carga va en `error`, con «Reintentar»
  const [fallo, setFallo] = useState('');
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
    setFallo('');
    try {
      await brigadesApi.cambiarEstado(session, 'ACTIVO');
      await cargar();
      setNotice('Quedó disponible. Ahora elija el evento y su zona para atender.');
    } catch (err) {
      setFallo(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // "Finalizar": el brigadista deja de estar disponible (queda INACTIVO) hasta que se active de nuevo.
  const finalizar = async () => {
    if (!(await confirmar({
      titulo: '¿Finalizar su turno?',
      texto: 'Quedará como no disponible y no recibirá nuevas asignaciones hasta que vuelva a activarse.',
      accion: 'Finalizar mi turno',
      peligro: true,
    }))) return;
    setBusy(true);
    setNotice('');
    setFallo('');
    try {
      await brigadesApi.cambiarEstado(session, 'INACTIVO');
      await cargar();
      setEditandoZona(false);
      setNotice('Finalizó su turno: quedó como no disponible.');
    } catch (err) {
      setFallo(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const quitarZona = async () => {
    if (!actual?.ubicacionId) return;
    if (!(await confirmar({
      titulo: `¿Quitar su asignación de ${miZona || 'su edificio'}?`,
      texto: 'Dejará de recibir los incidentes de esa zona. Puede elegir otra cuando quiera.',
      accion: 'Quitar mi asignación',
      peligro: true,
    }))) return;
    setBusy(true);
    setNotice('');
    setFallo('');
    try {
      await brigadesApi.quitarEdificio(session, actual.evento.eventoId);
      await cargar();
      setEditandoZona(false);
      setNotice('Quitó su asignación. Puede elegir otro edificio cuando quiera.');
    } catch (err) {
      setFallo(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="ev-head bp-head">
        <div>
          <span className="badge">BRIGADISTAS</span>
          <h1 style={{ marginTop: 10 }}>Panel de responsabilidades</h1>
          <p>Elija el evento, su zona y atienda los incidentes que le corresponden.</p>
        </div>
        <div className="hbtns" role="group" aria-label="Mi disponibilidad">
          {activo
            ? <button type="button" className="btn ghost" disabled={busy} onClick={() => void finalizar()}>{busy ? 'Finalizando…' : 'Finalizar mi turno'}</button>
            : <button type="button" className="btn light" disabled={busy} onClick={() => void disponible()}>{busy ? 'Activando…' : 'Estoy disponible'}</button>}
        </div>
      </header>
      <main className="ev-main bp-main">
        {notice && <Mensaje tono="exito">{notice}</Mensaje>}
        {fallo && <Mensaje tono="error">{fallo}</Mensaje>}
        {error && <Mensaje tono="error" onReintentar={() => void cargar()}>{error}</Mensaje>}
        {loading && <Cargando texto="Cargando…" />}

        {!loading && eventos.length === 0 && (
          <EstadoVacio titulo="No hay eventos programados ni en ejecución">Cuando se programe uno, aquí podrá elegir su zona y atender incidentes.</EstadoVacio>
        )}

        <SelectorEvento valor={actual?.evento.eventoId}
          eventos={eventos.map(({ evento: e }) => ({ id: e.eventoId, nombre: e.nombre, simulacro: e.simulacro, enCurso: e.estado === 'EN_EJECUCION' }))}
          onElegir={(id) => { setEventoId(id); setEditandoZona(false); setNotice(''); }} />

        {actual && (
          <section className="ev-card bp-evento">
            <div>
              <span className={`st ${actual.evento.estado === 'EN_EJECUCION' ? 'IN_PROGRESS' : 'SCHEDULED'}`}>
                {ESTADO_EVENTO[actual.evento.estado] ?? actual.evento.estado}
              </span>
              <h2 style={{ marginTop: 8 }}>{actual.evento.nombre}</h2>
              <span className="help">
                {actual.evento.simulacro ? 'Simulacro' : 'Evento real'}{inicio ? ` · Inició ${formatDate(inicio)}` : ''}
              </span>
            </div>
            {activo && (
              <>
                <div className="ev-zone">
                  <span>Mi zona</span>
                  <b>{miZona || 'Sin asignar'}</b>
                </div>
                {!editandoZona && (
                  <div className="bp-zona-acts">
                    <button type="button" className={`btn sm ${actual.ubicacionId ? 'white' : 'red'}`} disabled={busy}
                      onClick={() => setEditandoZona(true)}>
                      {actual.ubicacionId ? 'Cambiar zona' : 'Elegir mi zona'}
                    </button>
                    {actual.ubicacionId && (
                      <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void quitarZona()}>Quitar mi asignación</button>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* En celular, la tarjeta del evento se resume en una línea para que el primer «Atender» quede a la vista */}
        {actual && activo && !editandoZona && (
          <p className="bp-resumen">
            <span><b>Mi zona:</b> {miZona || 'Sin asignar'}</span>
            <span aria-hidden="true">·</span>
            <button type="button" className="plink" disabled={busy} onClick={() => setEditandoZona(true)}
              aria-label={actual.ubicacionId ? 'Cambiar mi zona' : 'Elegir mi zona'}>
              {actual.ubicacionId ? 'Cambiar' : 'Elegir'}
            </button>
          </p>
        )}

        {actual && !activo && (
          <Mensaje tono="info">Marque «Estoy disponible» para elegir su zona y atender incidentes.</Mensaje>
        )}

        {actual && activo && editandoZona && (
          <section className="ev-card" id="bp-mapa" aria-labelledby="bp-mapa-titulo">
            <h2 id="bp-mapa-titulo">{actual.ubicacionId ? 'Cambiar zona' : 'Elegir mi zona'}</h2>
            <p className="help">
              Toque en el mapa o en la lista el edificio donde va a apoyar durante el evento.
              {actual.ubicacionId ? ' Puede cambiar de zona salvo que sea el único brigadista de la suya.' : ''}
            </p>
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
            <div className="bp-zona-acts">
              <button type="button" className="btn white sm" disabled={busy} onClick={() => setEditandoZona(false)}>
                {actual.ubicacionId ? 'Cancelar el cambio' : 'Cerrar el mapa'}
              </button>
              {actual.ubicacionId && (
                <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void quitarZona()}>Quitar mi asignación</button>
              )}
            </div>
          </section>
        )}

        {actual && (
          <section className="ev-card bp-incidentes" aria-labelledby="bp-incidentes">
            <h2 id="bp-incidentes">Incidentes<span className="bp-evento-nombre"> · {actual.evento.nombre}</span></h2>
            {actual.evento.estado === 'EN_EJECUCION'
              ? (
                  <>
                    <p className="help bp-ayuda">Los que reportó, los que tiene asignados y los de su zona. Toque «Atender» para iniciar la atención y registrar el resultado.</p>
                    {activo && !actual.ubicacionId && (
                      <Mensaje tono="aviso" compacto>Aún no tiene zona: elija una para recibir los incidentes de ese lugar.</Mensaje>
                    )}
                    <IncidentesEvento session={session} eventoId={actual.evento.eventoId} modo="brigadista" refresco={tick} />
                    {canRegisterAssistance && (
                      <a className="btn white sm" style={{ alignSelf: 'flex-start' }} href={`#/brigadista/reportar/${actual.evento.eventoId}`}>Reportar incidente</a>
                    )}
                  </>
                )
              : <EstadoVacio titulo="El evento aún no está en ejecución">Cuando inicie, aquí verá los incidentes de su zona.</EstadoVacio>}
          </section>
        )}
      </main>
    </>
  );
}
