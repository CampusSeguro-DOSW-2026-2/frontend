import { useEffect, useState, type ReactNode } from 'react';
import { Info, LifeBuoy, ShieldCheck } from '../../../shared/components/Icons';
import { PageHeader } from '../../../shared/components/Layout';
import { ApiError, errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { AccionesEvento } from '../components/AccionesEvento';
import { campusApi } from '../services/campus';
import { checkinApi } from '../services/checkin';
import type {
  Checkin, CheckinRequest, Edificio, EstadoCheckin, Evento, PuntoEncuentro, TipoUbicacion,
} from '../types';
import { ESTADOS, fechaHora, textoEstado, textoEstadoEvento, tipoEvento } from '../utils/labels';
import '../styles/checkin.css';

/** Mensaje de éxito del reporte (F-01). */
export const ESTADO_REGISTRADO = 'Su estado quedó registrado.';

/** Mensajes de éxito de Requiero asistencia según el envío de la solicitud a MS05 (F-01). */
const ASISTENCIA_REGISTRADA: Record<string, string> = {
  ENVIADA: 'Su estado quedó registrado y su solicitud de asistencia fue enviada.',
  PENDIENTE_ENVIO: 'Su estado quedó registrado. La solicitud de asistencia se enviará en cuanto el servicio esté disponible.',
  RECHAZADA: 'Su estado quedó registrado, pero la solicitud de asistencia no pudo crearse. Un coordinador la revisará.',
};

/** Lugares donde se puede pedir asistencia que ofrece esta pantalla (RN-MS04-09). */
const TIPOS_UBICACION: { codigo: TipoUbicacion; texto: string }[] = [
  { codigo: 'EDIFICIO', texto: 'Edificio' },
  { codigo: 'PUNTO_ENCUENTRO', texto: 'Punto de encuentro' },
];

type Lista<T> =
  | { estado: 'sin-cargar' }
  | { estado: 'cargando' }
  | { estado: 'listo'; items: T[] }
  | { estado: 'error'; mensaje: string };

type Vigente =
  | { estado: 'cargando' }
  | { estado: 'listo'; checkin: Checkin | null }
  | { estado: 'error'; mensaje: string };

/**
 * Centro del evento en curso (RF-MS04-01 a RF-MS04-05, F-01): reúne lo que la persona necesita mientras el evento está
 * en ejecución. El check-in es de MS04; las rutas (MS02) y los incidentes (MS05) son accesos a sus propias pantallas,
 * visibles solo con su permiso. El mismo formulario registra el primer check-in y lo actualiza, con las cuatro
 * opciones siempre visibles. Elegir Me estoy evacuando o No estoy en el campus envía el reporte; Estoy a salvo pide el
 * punto de encuentro y Requiero asistencia, el lugar (edificio o punto de encuentro de MS02), y elegirlo lo envía. Así
 * el reporte se completa en máximo 3 interacciones desde el menú (RNF-MS04-07).
 *
 * La pantalla de inicio la usa con el evento que ya consultó (`eventoActual`), así no lo vuelve a pedir, y con un
 * aviso (`aviso`) que se muestra antes de los accesos.
 */
export default function CentroEvento({ session, eventoId, eventoActual, aviso }: {
  session: Session; eventoId: string; eventoActual?: Evento; aviso?: ReactNode;
}) {
  const [eventoConsultado, setEventoConsultado] = useState<Evento | null>(null);
  const evento = eventoActual ?? eventoConsultado;
  const [vigente, setVigente] = useState<Vigente>({ estado: 'cargando' });
  const [elegido, setElegido] = useState<EstadoCheckin | null>(null);
  const [puntos, setPuntos] = useState<Lista<PuntoEncuentro>>({ estado: 'sin-cargar' });
  const [edificios, setEdificios] = useState<Lista<Edificio>>({ estado: 'sin-cargar' });
  const [tipoUbicacion, setTipoUbicacion] = useState<TipoUbicacion>('EDIFICIO');
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState('');
  const [errorCampo, setErrorCampo] = useState('');

  const actual = vigente.estado === 'listo' ? vigente.checkin : null;

  // Cada vez que se elige la opción se piden de nuevo a MS02 para ver los cambios; mientras tanto se deja la lista que
  // ya estaba, si la había
  const cargarPuntos = () => {
    setPuntos((previa) => (previa.estado === 'listo' ? previa : { estado: 'cargando' }));
    campusApi.puntosEncuentro(session)
      .then((items) => setPuntos({ estado: 'listo', items }))
      .catch((err: unknown) => setPuntos({ estado: 'error', mensaje: errorMessage(err) }));
  };

  const cargarEdificios = () => {
    setEdificios((previa) => (previa.estado === 'listo' ? previa : { estado: 'cargando' }));
    campusApi.edificios(session)
      .then((items) => setEdificios({ estado: 'listo', items }))
      .catch((err: unknown) => setEdificios({ estado: 'error', mensaje: errorMessage(err) }));
  };

  // El encabezado sale de los eventos activos del usuario; si no está ahí, MS04 dirá por qué al reportar
  useEffect(() => {
    if (eventoActual) return undefined;
    let activo = true;
    checkinApi.eventosActivos(session)
      .then((eventos) => { if (activo) setEventoConsultado(eventos.find((e) => e.evento_id === eventoId) ?? null); })
      .catch(() => { /* el encabezado queda genérico */ });
    return () => { activo = false; };
  }, [session, eventoId, eventoActual]);

  // Estado vigente (RF-MS04-05): si ya reportó, se muestra y se puede cambiar (RF-MS04-03)
  useEffect(() => {
    let activo = true;
    checkinApi.estadoVigente(session, eventoId)
      .then((checkin) => {
        if (!activo) return;
        setVigente({ estado: 'listo', checkin });
        // Para mostrar el nombre del lugar donde está o donde pidió asistencia
        const tipo = checkin?.estado === 'NEEDS_ASSISTANCE' ? checkin.ubicacion?.tipo : undefined;
        if (checkin?.estado === 'SAFE' || tipo === 'PUNTO_ENCUENTRO') {
          campusApi.puntosEncuentro(session)
            .then((items) => { if (activo) setPuntos({ estado: 'listo', items }); })
            .catch(() => { /* se muestra sin el nombre del lugar */ });
        } else if (tipo === 'EDIFICIO') {
          campusApi.edificios(session)
            .then((items) => { if (activo) setEdificios({ estado: 'listo', items }); })
            .catch(() => { /* se muestra sin el nombre del lugar */ });
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
      // Si no se guardó, la opción marcada vuelve a ser el estado vigente (con un lugar por elegir sigue abierta la lista)
      if (cuerpo.estado !== 'SAFE' && cuerpo.estado !== 'NEEDS_ASSISTANCE') setElegido(null);
      setError(errorMessage(err));
      if (err instanceof ApiError) setErrorCampo(err.fields.punto ?? err.fields.ubicacion ?? err.fields.estado ?? '');
    } finally {
      setEnviando(false);
    }
  };

  const elegirTipoUbicacion = (tipo: TipoUbicacion) => {
    setTipoUbicacion(tipo);
    if (tipo === 'EDIFICIO') cargarEdificios();
    if (tipo === 'PUNTO_ENCUENTRO') cargarPuntos();
  };

  const elegir = (estado: EstadoCheckin) => {
    setElegido(estado);
    if (estado === 'SAFE' || estado === 'NEEDS_ASSISTANCE') {
      setError('');
      setConfirmado(false);
      if (estado === 'SAFE') cargarPuntos();
      if (estado === 'NEEDS_ASSISTANCE') elegirTipoUbicacion(tipoUbicacion);
      return;
    }
    void enviar({ estado });
  };

  const nombreEn = <T extends { id: string; nombre: string }>(lista: Lista<T>, id: string | null | undefined) =>
    (lista.estado === 'listo' ? lista.items.find((i) => i.id === id)?.nombre : undefined);

  const describir = (checkin: Checkin) => {
    let lugar: string | undefined;
    if (checkin.estado === 'SAFE') lugar = nombreEn(puntos, checkin.punto_encuentro_id);
    if (checkin.estado === 'NEEDS_ASSISTANCE' && checkin.ubicacion) {
      lugar = nombreEn(checkin.ubicacion.tipo === 'EDIFICIO' ? edificios : puntos, checkin.ubicacion.id);
    }
    return lugar ? `${textoEstado(checkin.estado)} en ${lugar}` : textoEstado(checkin.estado);
  };

  const mensajeExito = (checkin: Checkin) => {
    const envio = checkin.solicitud_asistencia?.estado_envio;
    if (checkin.estado === 'NEEDS_ASSISTANCE' && envio && ASISTENCIA_REGISTRADA[envio]) return ASISTENCIA_REGISTRADA[envio];
    return `${ESTADO_REGISTRADO} ${describir(checkin)}.`;
  };

  // La opción marcada es la que el usuario acaba de elegir o, si no ha elegido, su estado vigente
  const marcado = elegido ?? actual?.estado ?? null;
  const lugares = tipoUbicacion === 'EDIFICIO' ? edificios : puntos;
  const recargarLugares = tipoUbicacion === 'EDIFICIO' ? cargarEdificios : cargarPuntos;

  return (
    <>
      <PageHeader
        badge={evento ? `${tipoEvento(evento.simulacro)} · ${textoEstadoEvento(evento.estado)}`.toUpperCase() : 'CHECK-IN'}
        title={evento?.nombre ?? 'Reportar mi estado'}
        subtitle={evento ? 'Evacuación del campus en curso' : 'Elija la opción que describe su situación.'}
        context={evento?.fecha_inicio ? `Iniciado: ${fechaHora(evento.fecha_inicio)}` : undefined}
      />
      <main className="content">
        {aviso}
        <AccionesEvento session={session} />

        <section className="chk-checkin" aria-labelledby="chk-estado-titulo">
          <div className="chk-checkin-cab">
            <div>
              <h2 id="chk-estado-titulo" className="title sm22">Check-in · ¿Cómo se encuentra?</h2>
              {vigente.estado === 'cargando' && <p className="chk-sub" role="status">Consultando su estado actual…</p>}
              {vigente.estado === 'listo' && (
                <p className="chk-sub" role="status">
                  {actual
                    ? <>Su estado actual: <b>{describir(actual)}</b>{actual.fecha_hora && ` · ${fechaHora(actual.fecha_hora)}`}. Puede cambiarlo.</>
                    : 'Seleccione su estado actual. Aún no ha registrado su check-in en este evento.'}
                </p>
              )}
            </div>
            <div className="chk-estados" role="group" aria-label="Estado">
              {ESTADOS.map(({ codigo, texto }) => (
                <button key={codigo} type="button" className="chk-estado" aria-pressed={marcado === codigo}
                  disabled={enviando} onClick={() => elegir(codigo)}>
                  {codigo === 'SAFE' && <ShieldCheck />}
                  {codigo === 'NEEDS_ASSISTANCE' && <LifeBuoy />}
                  {texto}
                </button>
              ))}
            </div>
          </div>
          {vigente.estado === 'error' && <p className="notice err" role="alert">{vigente.mensaje}</p>}

          {elegido === 'SAFE' && (
            <div className="chk-puntos" role="region" aria-labelledby="chk-punto-titulo">
              <h3 id="chk-punto-titulo" className="chk-paso">¿En qué punto de encuentro está?</h3>
              {puntos.estado === 'cargando' && <p className="notice" role="status">Consultando los puntos de encuentro…</p>}
              {puntos.estado === 'error' && (
                <>
                  <p className="notice err" role="alert">{puntos.mensaje}</p>
                  <button type="button" className="btn white chk-retry" onClick={cargarPuntos}>Intentar de nuevo</button>
                </>
              )}
              {puntos.estado === 'listo' && puntos.items.length === 0 && (
                <p className="notice" role="status">No hay puntos de encuentro disponibles.</p>
              )}
              {puntos.estado === 'listo' && puntos.items.length > 0 && (
                <ul aria-label="Puntos de encuentro">
                  {puntos.items.map((p) => (
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
            </div>
          )}

          {elegido === 'NEEDS_ASSISTANCE' && (
            <div className="chk-puntos" role="region" aria-labelledby="chk-lugar-titulo">
              <h3 id="chk-lugar-titulo" className="chk-paso">¿Dónde necesita la asistencia?</h3>
              <div className="chk-tabs" role="group" aria-label="Tipo de lugar">
                {TIPOS_UBICACION.map(({ codigo, texto }) => (
                  <button key={codigo} type="button" className="chk-tab" aria-pressed={tipoUbicacion === codigo}
                    disabled={enviando} onClick={() => elegirTipoUbicacion(codigo)}>
                    {texto}
                  </button>
                ))}
              </div>
              {lugares.estado === 'cargando' && <p className="notice" role="status">Consultando los lugares…</p>}
              {lugares.estado === 'error' && (
                <>
                  <p className="notice err" role="alert">{lugares.mensaje}</p>
                  <button type="button" className="btn white chk-retry" onClick={recargarLugares}>Intentar de nuevo</button>
                </>
              )}
              {lugares.estado === 'listo' && lugares.items.length === 0 && (
                <p className="notice" role="status">No hay lugares disponibles.</p>
              )}
              {lugares.estado === 'listo' && lugares.items.length > 0 && (
                <ul aria-label="Lugares">
                  {lugares.items.map((l) => (
                    <li key={l.id}>
                      <button type="button" className="chk-punto" disabled={enviando}
                        aria-pressed={actual?.estado === 'NEEDS_ASSISTANCE' && actual.ubicacion?.tipo === tipoUbicacion
                          && actual.ubicacion.id === l.id}
                        onClick={() => void enviar({ estado: 'NEEDS_ASSISTANCE', ubicacion: { tipo: tipoUbicacion, id: l.id } })}>
                        {l.nombre}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {errorCampo && <p className="error" role="alert">{errorCampo}</p>}
            </div>
          )}

          {enviando && <p className="notice" role="status">Enviando su estado…</p>}
          {error && !errorCampo && <p className="notice err" role="alert">{error}</p>}
          {confirmado && actual && <p className="notice chk-ok" role="status">{mensajeExito(actual)}</p>}
        </section>

        <p className="chk-info"><Info /> El check-in informa su estado a la brigada. «Requiero asistencia» envía una solicitud de ayuda con el lugar donde está.</p>
      </main>
    </>
  );
}
