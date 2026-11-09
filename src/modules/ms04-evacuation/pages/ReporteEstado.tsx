import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { ApiError, errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import SelectorUbicacion from '../components/SelectorUbicacion';
import { campusApi } from '../services/campus';
import { checkinApi } from '../services/checkin';
import type { Checkin, CheckinRequest, EstadoCheckin, Evento, PuntoEncuentro, Ubicacion } from '../types';
import { ESTADOS, fechaHora, textoEstado, tipoEvento } from '../utils/labels';
import '../styles/checkin.css';

/** Mensaje de éxito del reporte (F-01). */
export const ESTADO_REGISTRADO = 'Su estado quedó registrado.';

type Puntos =
  | { estado: 'sin-cargar' }
  | { estado: 'cargando' }
  | { estado: 'listo'; puntos: PuntoEncuentro[] }
  | { estado: 'error'; mensaje: string };

type Vigente =
  | { estado: 'cargando' }
  | { estado: 'listo'; checkin: Checkin | null }
  | { estado: 'error'; mensaje: string };

/**
 * F-01 Reporte de estado (RF-MS04-02 y RF-MS04-03). El mismo formulario registra el primer check-in y lo actualiza:
 * si el usuario ya reportó, muestra su estado vigente y le permite cambiarlo. Las cuatro opciones se ven siempre.
 * Elegir Me estoy evacuando o No estoy en el campus envía el reporte; Estoy a salvo muestra los puntos de encuentro
 * de MS02 y elegir uno lo envía. Así el reporte se completa en máximo 3 interacciones desde el menú (RNF-MS04-07).
 * Requiero asistencia pide dónde se necesita la asistencia (edificio, espacio o punto de encuentro de MS02) y MS04
 * genera la solicitud en MS05 (RF-MS04-04).
 */
export default function ReporteEstado({ session, eventoId }: { session: Session; eventoId: string }) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [vigente, setVigente] = useState<Vigente>({ estado: 'cargando' });
  const [elegido, setElegido] = useState<EstadoCheckin | null>(null);
  const [puntos, setPuntos] = useState<Puntos>({ estado: 'sin-cargar' });
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState('');
  const [errorCampo, setErrorCampo] = useState('');
  /** Nombre legible de cada ubicación de MS02 ya conocida (id → nombre) */
  const [lugares, setLugares] = useState<Record<string, string>>({});

  const actual = vigente.estado === 'listo' ? vigente.checkin : null;

  const recordarLugar = (ubicacion: Ubicacion, nombre: string) => {
    if (nombre) setLugares((previos) => ({ ...previos, [ubicacion.id]: nombre }));
  };

  const cargarPuntos = () => {
    setPuntos({ estado: 'cargando' });
    campusApi.puntosEncuentro(session)
      .then((lista) => setPuntos({ estado: 'listo', puntos: lista }))
      .catch((err: unknown) => setPuntos({ estado: 'error', mensaje: errorMessage(err) }));
  };

  // El nombre del evento sale de los eventos activos del usuario; si no está ahí, MS04 dirá por qué al reportar
  useEffect(() => {
    let activo = true;
    checkinApi.eventosActivos(session)
      .then((eventos) => { if (activo) setEvento(eventos.find((e) => e.evento_id === eventoId) ?? null); })
      .catch(() => { /* el encabezado queda genérico */ });
    return () => { activo = false; };
  }, [session, eventoId]);

  // Estado vigente (RF-MS04-05): si ya reportó, se muestra y se puede cambiar (RF-MS04-03)
  useEffect(() => {
    let activo = true;
    checkinApi.estadoVigente(session, eventoId)
      .then((checkin) => {
        if (!activo) return;
        setVigente({ estado: 'listo', checkin });
        // Para mostrar el nombre del punto de encuentro donde está
        if (checkin?.estado === 'SAFE') {
          campusApi.puntosEncuentro(session)
            .then((lista) => { if (activo) setPuntos({ estado: 'listo', puntos: lista }); })
            .catch(() => { /* se muestra sin el nombre del punto */ });
        }
        // Para mostrar dónde pidió la asistencia
        const ubicacion = checkin?.ubicacion;
        if (ubicacion) {
          campusApi.nombreUbicacion(session, ubicacion)
            .then((nombre) => { if (activo) recordarLugar(ubicacion, nombre); });
        }
      })
      .catch((err: unknown) => { if (activo) setVigente({ estado: 'error', mensaje: errorMessage(err) }); });
    return () => { activo = false; };
  }, [session, eventoId]);

  const enviar = async (cuerpo: CheckinRequest) => {
    setEnviando(true);
    setError('');
    setErrorCampo('');
    setConfirmado(false);
    try {
      const checkin = await checkinApi.reportar(session, eventoId, cuerpo);
      setVigente({ estado: 'listo', checkin });
      setConfirmado(true);
    } catch (err) {
      // Si no se guardó, la opción marcada vuelve a ser el estado vigente (con Estoy a salvo y Requiero asistencia
      // sigue abierta la lista de lugares)
      if (cuerpo.estado !== 'SAFE' && cuerpo.estado !== 'NEEDS_ASSISTANCE') setElegido(null);
      setError(errorMessage(err));
      if (err instanceof ApiError) {
        setErrorCampo(err.fields.punto ?? err.fields.ubicacion ?? err.fields.estado ?? '');
      }
    } finally {
      setEnviando(false);
    }
  };

  const elegir = (estado: EstadoCheckin) => {
    setElegido(estado);
    if (estado === 'SAFE') {
      setError('');
      setConfirmado(false);
      if (puntos.estado === 'sin-cargar' || puntos.estado === 'error') cargarPuntos();
      return;
    }
    if (estado === 'NEEDS_ASSISTANCE') {
      setError('');
      setErrorCampo('');
      setConfirmado(false);
      return;
    }
    void enviar({ estado });
  };

  const pedirAsistencia = (ubicacion: Ubicacion, nombre: string) => {
    recordarLugar(ubicacion, nombre);
    void enviar({ estado: 'NEEDS_ASSISTANCE', ubicacion });
  };

  const nombrePunto = (id: string | null) =>
    (puntos.estado === 'listo' ? puntos.puntos.find((p) => p.id === id)?.nombre : undefined);

  const describir = (checkin: Checkin) => {
    const lugar = checkin.estado === 'SAFE'
      ? nombrePunto(checkin.punto_encuentro_id)
      : (checkin.ubicacion ? lugares[checkin.ubicacion.id] : undefined);
    return lugar ? `${textoEstado(checkin.estado)} en ${lugar}` : textoEstado(checkin.estado);
  };

  // La opción marcada es la que el usuario acaba de elegir o, si no ha elegido, su estado vigente
  const marcado = elegido ?? actual?.estado ?? null;

  return (
    <>
      <PageHeader
        badge={evento ? tipoEvento(evento.simulacro).toUpperCase() : 'CHECK-IN'}
        title={evento?.nombre ?? 'Reportar mi estado'}
        subtitle="¿Cómo estás? Elige una opción"
      />
      <main className="content">
        {vigente.estado === 'cargando' && <p className="notice" role="status">Consultando su estado actual…</p>}
        {vigente.estado === 'error' && <p className="notice err" role="alert">{vigente.mensaje}</p>}
        {vigente.estado === 'listo' && (
          <div className="chk-actual" role="status">
            {actual ? (
              <>
                <small>Su estado actual</small>
                <b>{describir(actual)}</b>
                {actual.fecha_hora && <span>Reportado: {fechaHora(actual.fecha_hora)} · Puede cambiarlo.</span>}
              </>
            ) : (
              <>
                <small>Su estado actual</small>
                <b>Todavía no ha reportado su estado en este evento.</b>
              </>
            )}
          </div>
        )}

        <section aria-labelledby="chk-estado-titulo">
          <h2 id="chk-estado-titulo" className="title sm22">{actual ? 'Cambiar mi estado' : 'Mi estado'}</h2>
          <div className="chk-opciones" role="group" aria-label="Estado" style={{ marginTop: 16 }}>
            {ESTADOS.map(({ codigo, texto }) => (
              <button key={codigo} type="button" className="chk-opcion" aria-pressed={marcado === codigo}
                disabled={enviando} onClick={() => elegir(codigo)}>
                {texto}
              </button>
            ))}
          </div>
        </section>

        {elegido === 'SAFE' && (
          <section className="chk-puntos" aria-labelledby="chk-punto-titulo">
            <h2 id="chk-punto-titulo" className="title sm22">¿En qué punto de encuentro está?</h2>
            {puntos.estado === 'cargando' && <p className="notice" role="status">Consultando los puntos de encuentro…</p>}
            {puntos.estado === 'error' && (
              <>
                <p className="notice err" role="alert">{puntos.mensaje}</p>
                <button type="button" className="btn white chk-retry" onClick={cargarPuntos}>Intentar de nuevo</button>
              </>
            )}
            {puntos.estado === 'listo' && puntos.puntos.length === 0 && (
              <p className="notice" role="status">No hay puntos de encuentro disponibles.</p>
            )}
            {puntos.estado === 'listo' && puntos.puntos.length > 0 && (
              <ul aria-label="Puntos de encuentro">
                {puntos.puntos.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="chk-punto" disabled={enviando}
                      aria-pressed={actual?.estado === 'SAFE' && actual.punto_encuentro_id === p.id}
                      onClick={() => void enviar({ estado: 'SAFE', punto_encuentro_id: p.id })}>
                      {p.nombre}
                      <small>{[p.codigo, p.ubicacion].filter(Boolean).join(' · ')}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errorCampo && <p className="error" role="alert">{errorCampo}</p>}
          </section>
        )}

        {elegido === 'NEEDS_ASSISTANCE' && (
          <>
            <SelectorUbicacion session={session} deshabilitado={enviando}
              seleccionada={actual?.estado === 'NEEDS_ASSISTANCE' ? actual.ubicacion : null}
              onElegir={pedirAsistencia} />
            {errorCampo && <p className="error" role="alert">{errorCampo}</p>}
          </>
        )}

        {enviando && <p className="notice" role="status">Enviando su estado…</p>}
        {error && !errorCampo && <p className="notice err" role="alert">{error}</p>}
        {confirmado && actual && (
          <p className="notice chk-ok" role="status">{ESTADO_REGISTRADO} {describir(actual)}.</p>
        )}
      </main>
    </>
  );
}
