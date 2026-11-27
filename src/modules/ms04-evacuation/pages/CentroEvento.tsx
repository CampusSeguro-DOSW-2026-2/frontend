import { useEffect, useState, type ReactNode } from 'react';
import { Cargando } from '../../../shared/components/Cargando';
import { Home, LifeBuoy, LogOut, ShieldCheck } from '../../../shared/components/Icons';
import { PageHeader } from '../../../shared/components/Layout';
import { Mensaje } from '../../../shared/components/Mensaje';
import { PERMISSION } from '../../../shared/permissions';
import { ApiError, errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
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

/** Ícono de cada estado del check-in. */
const ICONO_ESTADO: Record<EstadoCheckin, ReactNode> = {
  SAFE: <ShieldCheck />,
  EVACUATING: <LogOut />,
  NEEDS_ASSISTANCE: <LifeBuoy />,
  OFF_CAMPUS: <Home />,
};

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
 * opciones siempre visibles. Elegir Estoy evacuando o No estoy en el campus envía el reporte; Estoy a salvo pide el
 * punto de encuentro y Requiero asistencia, el lugar (edificio o punto de encuentro de MS02), y elegirlo lo envía. Así
 * el reporte se completa en máximo 3 interacciones desde el menú (RNF-MS04-07).
 *
 * «Requiero asistencia» se vincula con «Necesito ayuda» de MS05 (una sola solicitud): con ms05:incident:report abre ese
 * formulario, que registra aquí el estado y deja en MS05 la prioridad, la descripción y la evidencia. Sin ese permiso
 * se pide solo el lugar, como antes.
 *
 * La pantalla de inicio la usa con el evento que ya consultó (`eventoActual`), así no lo vuelve a pedir; entonces el
 * encabezado es el de Inicio y el nombre del evento va dentro del recuadro del check-in; con la alerta
 * activa de MS03 (`alerta`), que va encima del check-in; con un aviso (`aviso`, p. ej. un servicio que no responde) que
 * va debajo del check-in, y con lo que va después de los accesos (`despues`: los otros eventos en curso). En celular,
 * el check-in y el estado actual quedan visibles sin desplazarse.
 */
export default function CentroEvento({ session, eventoId, eventoActual, alerta, aviso, despues, nota }: {
  session: Session; eventoId: string; eventoActual?: Evento; alerta?: ReactNode; aviso?: ReactNode; despues?: ReactNode;
  /** En Inicio: mini mensaje del recuadro del evento (p. ej. «Más reciente» cuando hay varios en curso). */
  nota?: string;
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

  // La solicitud de ayuda la gestiona MS05: su formulario registra también el estado del check-in
  const ayudaEnMs05 = hasPermission(session, PERMISSION.MS05_INCIDENT_REPORT);

  const elegir = (estado: EstadoCheckin) => {
    if (estado === 'NEEDS_ASSISTANCE' && ayudaEnMs05) {
      window.location.hash = `#/ayuda/${encodeURIComponent(eventoId)}`;
      return;
    }
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
      {/* En Inicio el encabezado es el de la sección y el evento va dentro del recuadro del check-in */}
      {eventoActual
        ? <PageHeader badge={evento ? `${tipoEvento(evento.simulacro)} en curso`.toUpperCase() : 'INICIO'}
            title="Bienvenido a CampusSeguro" subtitle="Aquí verá las emergencias y simulacros en curso." />
        : <PageHeader volver={{ href: '#/simulacro', texto: 'Inicio' }}
            badge={evento ? `${tipoEvento(evento.simulacro)} · ${textoEstadoEvento(evento.estado)}`.toUpperCase() : 'CHECK-IN'}
            title={evento?.nombre ?? 'Reportar mi estado'}
            subtitle={evento ? 'Evacuación del campus en curso' : 'Elija la opción que describe su situación.'}
            context={evento?.fecha_inicio ? `Iniciado: ${fechaHora(evento.fecha_inicio)}` : undefined}
          />}
      <main className="content">
        {alerta}

        <section className="chk-checkin" aria-labelledby="chk-estado-titulo">
          <div className="chk-checkin-cab">
            <div>
              <div className="chk-titulo-fila">
                <h2 id="chk-estado-titulo" className="title sm22">¿Cómo se encuentra?</h2>
                {eventoActual && evento && (
                  <div className={`chk-ev-sel${evento.simulacro ? '' : ' real'}`} role="group" aria-label="Evento actual">
                    {nota && <span className="chk-ev-sel-nota">{nota}</span>}
                    <b>{evento.nombre}</b>
                    <small>
                      <span className="chk-ev-sel-tipo">{tipoEvento(evento.simulacro)}</span>
                      {evento.fecha_inicio && ` · ${fechaHora(evento.fecha_inicio)}`}
                    </small>
                  </div>
                )}
              </div>
              {vigente.estado === 'cargando' && <Cargando texto="Consultando su estado actual…" />}
              {vigente.estado === 'listo' && (
                <p className={`chk-sub${actual ? ' chk-vigente' : ''}`} role="status">
                  {actual
                    ? <>Su estado actual: <b>{describir(actual)}</b>{actual.fecha_hora && ` (reportado: ${fechaHora(actual.fecha_hora)})`}. Puede cambiarlo.</>
                    : 'Seleccione su estado actual. Aún no ha registrado su check-in en este evento.'}
                </p>
              )}
            </div>
            <div className="chk-estados-col">
              <div className="chk-estados" role="group" aria-label="Estado">
                {ESTADOS.map(({ codigo, texto }) => (
                  <button key={codigo} type="button" className="chk-estado" aria-pressed={marcado === codigo}
                    disabled={enviando} onClick={() => elegir(codigo)}>
                    {ICONO_ESTADO[codigo]}
                    {texto}
                  </button>
                ))}
              </div>
              <small className="chk-nota">Elija «Estoy a salvo» solo cuando esté fuera de peligro.</small>
            </div>
          </div>
          {vigente.estado === 'error' && <Mensaje tono="error">{vigente.mensaje}</Mensaje>}

          {elegido === 'SAFE' && (
            <div className="chk-puntos" role="region" aria-labelledby="chk-punto-titulo">
              <h3 id="chk-punto-titulo" className="chk-paso">¿En qué punto de encuentro está?</h3>
              {puntos.estado === 'cargando' && <Cargando texto="Consultando los puntos de encuentro…" />}
              {puntos.estado === 'error' && <Mensaje tono="error" onReintentar={cargarPuntos}>{puntos.mensaje}</Mensaje>}
              {puntos.estado === 'listo' && puntos.items.length === 0 && (
                <Mensaje tono="aviso">No hay puntos de encuentro disponibles. Siga las indicaciones de la brigada.</Mensaje>
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
              {lugares.estado === 'cargando' && <Cargando texto="Consultando los lugares…" />}
              {lugares.estado === 'error' && <Mensaje tono="error" onReintentar={recargarLugares}>{lugares.mensaje}</Mensaje>}
              {lugares.estado === 'listo' && lugares.items.length === 0 && (
                <Mensaje tono="aviso">No hay lugares disponibles. Siga las indicaciones de la brigada.</Mensaje>
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

          {enviando && <Cargando texto="Enviando su estado…" />}
          {error && !errorCampo && <Mensaje tono="error">{error}</Mensaje>}
          {confirmado && actual && <Mensaje tono="exito">{mensajeExito(actual)}</Mensaje>}
        </section>

        {/* Un servicio que no responde no debe empujar el check-in hacia abajo: el aviso va después */}
        {aviso}

        <AccionesEvento session={session} />
        {despues}

        <Mensaje tono="info" compacto>
          El check-in informa su estado a la brigada.{' '}
          {ayudaEnMs05
            ? '«Requiero asistencia» abre la solicitud de ayuda: elija la urgencia y la zona, y la brigada la recibe con su estado.'
            : '«Requiero asistencia» le pide el lugar donde está para que la brigada lo encuentre.'}
        </Mensaje>
      </main>
    </>
  );
}
