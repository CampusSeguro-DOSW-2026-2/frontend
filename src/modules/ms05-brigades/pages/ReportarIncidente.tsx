import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { useEffect, useMemo, useState } from 'react';
import { CircleCheck, Plus, Send } from '../../../shared/components/Icons';
import { PageHeader } from '../../../shared/components/Layout';
import { ApiError, errorMessage, type FieldErrors } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import { PERMISSION } from '../../../shared/permissions';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { checkinApi } from '../../ms04-evacuation/services/checkin';
import { fechaHora, tipoEvento } from '../../ms04-evacuation/utils/labels';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventSummary } from '../../ms06-drills/types';
import { scopeLabelIn } from '../../ms06-drills/utils/labels';
import { EVIDENCE_TYPES, MAX_EVIDENCES, brigadesApi, tipoDesdeAlcance } from '../services/brigades';
import { PRIORIDADES, type Incidente } from '../types';
import PrioridadChip from '../components/PrioridadChip';
import '../styles/respuesta.css';

interface Props {
  session: Session;
  /** Evento elegido desde el panel o el check-in; sin él se usa el evento en ejecución (con varios, la persona elige). */
  eventId?: string;
  /** Brigadista reportando por otra persona (pide el nombre del afectado). */
  forOther?: boolean;
}

type Prioridad = (typeof PRIORIDADES)[number];

const ESTADO_TEXTO: Record<string, string> = {
  REPORTADO: 'Su solicitud quedó registrada. La coordinación ya la recibió y asignará un brigadista. Permanezca en un lugar seguro.',
  ASIGNADO: 'Su solicitud quedó registrada y la brigada de su zona ya fue avisada. Permanezca en un lugar seguro.',
};

/** La solicitud quedó en MS04 a la espera de MS05: la brigada la recibe en cuanto el servicio responda. */
const PENDIENTE_TEXTO = 'Su estado quedó registrado. La solicitud de ayuda llegará a la brigada en cuanto el servicio esté disponible. Permanezca en un lugar seguro.';

/** Lo que implica cada urgencia, en palabras de quien pide ayuda. */
const IMPLICA: Record<string, string> = {
  EMERGENCIA: 'Hay riesgo para la vida o una lesión grave. La brigada acude de inmediato.',
  URGENCIA_MODERADA: 'Necesita ayuda pronto, pero sin riesgo inmediato para la vida.',
  POCA_URGENCIA: 'Puede esperar a que la brigada llegue.',
};

type Resultado = { incidente: Incidente | null; fallidas: string[]; aviso?: string };

/** Edificio o zona del alcance del evento donde puede estar la persona. */
type Lugar = { id: string; type: 'BUILDING' | 'ZONE'; nombre: string };

/** Estados en los que el incidente todavía recibe atención; fuera de estos, una nueva solicitud crea otro caso. */
const ESTADOS_ABIERTOS = new Set(['REPORTADO', 'ASIGNADO', 'EN_ATENCION']);

/**
 * RF-BEI-04 y RF-BEI-05: "Necesito ayuda" (solicitud propia) y "Reportar incidente" (brigadista, para otra persona).
 * Dos pasos, como el mockup: primero la prioridad y luego el lugar, con descripción y evidencia opcionales. Los
 * edificios y zonas son el alcance del evento (MS06) y sus nombres salen del catálogo vivo de MS02.
 *
 * Una sola solicitud por persona: «Requiero asistencia» del check-in llega aquí. Con ms04:checkin:write, la solicitud
 * propia registra el estado en MS04 (que crea la solicitud en MS05) y luego la completa en MS05 con la prioridad, la
 * descripción y la evidencia. Si MS04 no la registra, se crea directamente en MS05 para no perder la ayuda.
 */
export default function ReportarIncidente({ session, eventId, forOther = false }: Props) {
  const [event, setEvent] = useState<EventSummary | null | undefined>(undefined);
  // Eventos en ejecución; con varios y sin evento en la ruta se pide elegir uno (no se envía al primero sin preguntar)
  const [opciones, setOpciones] = useState<EventSummary[] | null>(null);
  const [paso, setPaso] = useState<'prioridad' | 'zona'>('prioridad');
  const [ubicacion, setUbicacion] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [afectado, setAfectado] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Resultado | null>(null);
  // Nombres de edificios y zonas (MS02): el alcance del evento trae solo sus ids
  const { catalog, loading: cargandoNombres } = useScopeCatalog();

  useEffect(() => {
    eventsApi.active(session)
      .then((list) => {
        setOpciones(list);
        if (eventId) setEvent(list.find((e) => e.id === eventId) ?? null);
        else setEvent(list.length > 1 ? undefined : list[0] ?? null);
      })
      .catch((err) => { setMessage(errorMessage(err)); setEvent(null); });
  }, [session, eventId]);

  // Solo los edificios y zonas del alcance del evento: son los lugares con brigada asignada.
  const lugares = useMemo<Lugar[]>(() => (event?.scope ?? []).map((s) => ({
    id: s.id,
    type: s.type,
    nombre: cargandoNombres ? 'Cargando…' : scopeLabelIn(s.id, catalog),
  })), [event, catalog, cargandoNombres]);

  /**
   * RN-MS04-11: la solicitud de asistencia es una por persona y evento. Si su incidente ya se resolvió o cerró,
   * reutilizarla solo editaría el caso viejo; se crea uno nuevo en MS05 para que la brigada vuelva a recibirlo.
   */
  const solicitudSigueAbierta = async (eventoId: string, solicitudId: string): Promise<boolean> => {
    try {
      const pagina = await brigadesApi.misIncidentes(session, eventoId, 0, 100);
      const incidente = (pagina.contenido ?? []).find((i) => i.incidenteId === solicitudId);
      return incidente ? ESTADOS_ABIERTOS.has(incidente.estado) : false;
    } catch {
      // Sin poder comprobarlo, se conserva la solicitud existente para no duplicar el caso
      return true;
    }
  };
  // MS04 registra el estado del check-in y MS05 gestiona la solicitud (prioridad, brigadista y seguimiento)
  const viaCheckin = !forOther && hasPermission(session, PERMISSION.MS04_CHECKIN_WRITE);

  const elegirArchivos = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    const invalid = list.find((f) => !EVIDENCE_TYPES.includes(f.type));
    if (invalid) { setErrors((e) => ({ ...e, evidencias: `"${invalid.name}" no es una imagen (JPG, PNG, WEBP, GIF, BMP, TIFF o HEIC), un PDF o un MP4.` })); return; }
    if (list.length > MAX_EVIDENCES) { setErrors((e) => ({ ...e, evidencias: `Máximo ${MAX_EVIDENCES} archivos.` })); return; }
    setErrors((e) => ({ ...e, evidencias: undefined }));
    setArchivos(list);
  };

  const elegirPrioridad = (p: Prioridad) => {
    setPrioridad(p);
    setErrors((e) => ({ ...e, prioridad: undefined }));
    setPaso('zona');
  };

  const enviar = async () => {
    if (!event || !prioridad) return;
    const local: FieldErrors = {};
    if (!ubicacion) local.ubicacion = forOther ? 'Indique dónde está la persona.' : 'Seleccione la zona donde se encuentra.';
    if (forOther && !afectado.trim()) local.nombreAfectado = 'Escriba el nombre de la persona afectada.';
    setErrors(local);
    if (Object.keys(local).length) return;

    const zona = lugares.find((l) => l.id === ubicacion);
    if (!zona) {
      setErrors((e) => ({ ...e, ubicacion: 'Seleccione el lugar donde está.' }));
      return;
    }
    const texto = descripcion.trim() || undefined;
    setSaving(true);
    setMessage('');
    try {
      let resultado: Resultado | null = viaCheckin ? await porCheckin(event.id, zona, prioridad, texto) : null;
      if (!resultado) {
        const incidente = await brigadesApi.registrarIncidente(session, event.id, {
          prioridadId: prioridad.id, ubicacionId: zona.id, tipoUbicacion: tipoDesdeAlcance(zona.type),
          descripcion: texto, nombreAfectado: forOther ? afectado.trim() : undefined,
        });
        resultado = { incidente, fallidas: [] };
      }
      const { incidente } = resultado;
      if (incidente) {
        for (const f of archivos) {
          try { await brigadesApi.subirEvidencia(session, event.id, incidente.idIncidente, f); } catch { resultado.fallidas.push(f.name); }
        }
      } else if (archivos.length) {
        resultado.aviso = 'La evidencia no se pudo adjuntar todavía. Cuando la solicitud llegue a la brigada, puede agregarla desde «Mis incidentes».';
      }
      setDone(resultado);
    } catch (err) {
      setMessage(errorMessage(err));
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (err.fields.prioridad) setPaso('prioridad');
      }
    } finally {
      setSaving(false);
    }
  };

  /**
   * Requiero asistencia: MS04 guarda el estado y crea la solicitud en MS05 con la prioridad por defecto; aquí se
   * completa con la que eligió la persona. Devuelve null si MS04 no la registró (la pantalla la crea en MS05).
   */
  const porCheckin = async (eventoId: string, zona: Lugar, p: Prioridad, texto?: string): Promise<Resultado | null> => {
    let solicitud;
    try {
      const checkin = await checkinApi.reportar(session, eventoId, {
        estado: 'NEEDS_ASSISTANCE', ubicacion: { tipo: zona.type === 'ZONE' ? 'PUNTO_ENCUENTRO' : 'EDIFICIO', id: zona.id },
      });
      solicitud = checkin.solicitud_asistencia;
    } catch {
      return null;
    }
    if (solicitud?.estado_envio === 'PENDIENTE_ENVIO') return { incidente: null, fallidas: [], aviso: PENDIENTE_TEXTO };
    if (solicitud?.estado_envio !== 'ENVIADA' || !solicitud.id) return null;
    // Si el incidente anterior ya se resolvió o cerró, no se reutiliza la solicitud: se crea uno nuevo en MS05.
    if (!(await solicitudSigueAbierta(eventoId, solicitud.id))) return null;
    try {
      const incidente = await brigadesApi.completarIncidente(session, eventoId, solicitud.id, { prioridadId: p.id, descripcion: texto ?? '' });
      return { incidente, fallidas: [] };
    } catch {
      // La solicitud ya existe en MS05: no se crea otra
      return {
        incidente: { idIncidente: solicitud.id } as Incidente,
        fallidas: [],
        aviso: 'Su solicitud llegó a la brigada, pero no se pudieron guardar la prioridad ni la descripción. La brigada la atenderá como emergencia.',
      };
    }
  };

  const back = forOther ? '#/brigadista' : eventId ? `#/checkin/${encodeURIComponent(eventId)}` : '#/checkin';
  const enZona = paso === 'zona' && prioridad !== null;
  const textoVolver = forOther ? 'Volver al panel brigadista' : 'Volver al evento';

  return (
    <>
      {/* El encabezado no cambia entre pasos: es la misma solicitud; el paso se indica dentro de la tarjeta */}
      <PageHeader
        volver={{ href: back, texto: textoVolver }}
        badge={forOther ? 'REPORTAR INCIDENTE' : 'NECESITO AYUDA'}
        title={forOther ? 'Reportar un incidente' : 'Pedir asistencia a la brigada'}
        subtitle={forOther
          ? 'Para una persona que no puede pedir ayuda por sí misma. La brigada de la zona recibe el reporte.'
          : 'La brigada de su zona recibe su solicitud y acude a usted.'}
        context={event ? `${tipoEvento(event.simulacro)} · ${event.name}` : undefined}
      />
      <main className="content na-main">
        {event === undefined && !opciones && !message && <Cargando texto="Consultando los eventos en ejecución…" />}
        {event === undefined && opciones && opciones.length > 1 && (
          <section className="na-card" aria-labelledby="na-evento-titulo">
            <h2 id="na-evento-titulo" className="na-titulo">¿En qué evento necesita ayuda?</h2>
            <p className="na-sub">Hay {opciones.length} eventos en ejecución. Elija aquel en el que está participando.</p>
            <div className="na-opciones" role="group" aria-label="Evento">
              {opciones.map((e) => (
                <button key={e.id} type="button" className="na-opcion" onClick={() => setEvent(e)}>
                  <span className="na-opcion-txt">
                    <b>{e.name}</b>
                    <small>{tipoEvento(e.simulacro)}{(e.startedAt ?? e.startDate) && ` · Iniciado: ${fechaHora(e.startedAt ?? e.startDate)}`}</small>
                  </span>
                  <span className="na-opcion-ir" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {event === null && !message && <EstadoVacio titulo="No hay un evento en ejecución">Las solicitudes de ayuda se habilitan cuando inicia un evento.</EstadoVacio>}
        {message && <Mensaje tono="error">{message}</Mensaje>}

        {done && (
          <section className="na-card" role="status" aria-labelledby="na-listo-titulo">
            <span className="na-listo-ico" aria-hidden="true"><CircleCheck /></span>
            <h2 id="na-listo-titulo" className="na-titulo">{forOther ? 'Incidente reportado' : 'Solicitud enviada'}</h2>
            {done.incidente?.estado && <p className="na-texto">{forOther
              ? `Incidente registrado para ${done.incidente.nombreAfectado} (${done.incidente.estado === 'ASIGNADO' ? 'asignado a la brigada de la zona' : 'pendiente de asignar'}).`
              : ESTADO_TEXTO[done.incidente.estado] ?? 'Su solicitud quedó registrada. Permanezca en un lugar seguro.'}</p>}
            {done.aviso && <p className="na-texto">{done.aviso}</p>}
            {done.fallidas.length > 0 && <Mensaje tono="aviso">No se pudieron adjuntar: {done.fallidas.join(', ')}. Puede intentarlo de nuevo desde «Mis incidentes».</Mensaje>}
            {!forOther && (
              <ul className="na-pasos">
                <li>Permanezca en un lugar seguro y, si puede, visible.</li>
                <li>La brigada llega a la zona que indicó.</li>
                <li>Puede seguir el estado de su solicitud en «Mis incidentes».</li>
              </ul>
            )}
            <div className="na-acciones">
              {!forOther && hasPermission(session, PERMISSION.MS05_INCIDENT_MANAGE_OWN) && <a className="btn red" href="#/mis-incidentes">Ver mis incidentes</a>}
              <a className="btn white" href={back}>{textoVolver}</a>
            </div>
          </section>
        )}

        {event && !done && !enZona && (
          <section className="na-card" aria-labelledby="na-prio-titulo">
            <span className="na-paso">Paso 1 de 2</span>
            <h2 id="na-prio-titulo" className="na-titulo">¿Qué tan urgente es?</h2>
            <p className="na-sub">Elija la opción que mejor describe la situación{forOther ? ' de la persona' : ''}.</p>
            <div className="na-opciones" role="group" aria-label="Urgencia">
              {PRIORIDADES.map((p) => (
                <button key={p.id} type="button" className={`na-opcion na-prio ${p.codigo}`} aria-pressed={prioridad?.id === p.id} onClick={() => elegirPrioridad(p)}>
                  <span className="na-opcion-txt">
                    <b>{p.label}</b>
                    <small>{IMPLICA[p.codigo]}</small>
                  </span>
                  <span className="na-opcion-ir" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
            {errors.prioridad && <span className="error" role="alert">{errors.prioridad}</span>}
          </section>
        )}

        {event && !done && enZona && prioridad && (
          <form className="na-card" noValidate onSubmit={(e) => { e.preventDefault(); void enviar(); }} aria-labelledby="na-zona-titulo">
            <div className="na-resumen">
              <span className="na-paso">Paso 2 de 2</span>
              <span className="na-resumen-prio">Urgencia: <PrioridadChip codigo={prioridad.codigo} />
                <button type="button" className="na-link" onClick={() => setPaso('prioridad')}>Cambiar</button>
              </span>
            </div>

            {forOther && (
              <div className="na-sec">
                <label className="na-etiqueta" htmlFor="afectado">Persona afectada</label>
                <div className={`input${errors.nombreAfectado ? ' bad' : ''}`}><input id="afectado" maxLength={150} value={afectado} onChange={(e) => setAfectado(e.target.value)} placeholder="Nombre y apellido" /></div>
                {errors.nombreAfectado && <span className="error" role="alert">{errors.nombreAfectado}</span>}
              </div>
            )}

            <div className="na-sec">
              <h2 id="na-zona-titulo" className="na-titulo">{forOther ? '¿Dónde está la persona?' : '¿Dónde está?'}</h2>
              <p className="na-sub">Elija el edificio o la zona del evento donde está. La brigada asignada a ese lugar recibe la solicitud.</p>
              {cargandoNombres && lugares.length === 0 && <Cargando texto="Cargando los lugares…" />}
              {(['BUILDING', 'ZONE'] as const).map((tipo) => {
                const grupo = lugares.filter((l) => l.type === tipo);
                if (grupo.length === 0) return null;
                const titulo = tipo === 'BUILDING' ? 'Edificios' : 'Zonas seguras';
                return (
                  <div key={tipo} className="na-grupo">
                    <h3 className="na-grupo-titulo">{titulo}</h3>
                    <div className="na-zonas" role="group" aria-labelledby="na-zona-titulo">
                      {grupo.map((l) => (
                        <button key={`${l.type}-${l.id}`} type="button" className="na-zona" aria-pressed={ubicacion === l.id}
                          onClick={() => { setUbicacion(l.id); setErrors((e) => ({ ...e, ubicacion: undefined })); }}>
                          {l.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {lugares.length === 0 && !cargandoNombres && <p className="na-sub">El evento no tiene zonas definidas.</p>}
              {errors.ubicacion && <span className="error" role="alert">{errors.ubicacion}</span>}
            </div>

            <div className="na-sec">
              <label className="na-etiqueta" htmlFor="desc">Descripción <span className="na-opcional">Opcional</span></label>
              <div className="input area"><textarea id="desc" rows={3} maxLength={viaCheckin ? 500 : 1000} placeholder="Qué ocurrió, el piso o un punto de referencia…" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
              {errors.descripcion && <span className="error" role="alert">{errors.descripcion}</span>}
            </div>

            <div className="na-sec">
              <span className="na-etiqueta">Evidencia <span className="na-opcional">Opcional</span></span>
              <label className="na-adjuntar">
                <input type="file" multiple accept={EVIDENCE_TYPES.join(',')} onChange={(e) => elegirArchivos(e.target.files)} />
                <span className="na-adjuntar-ico" aria-hidden="true"><Plus /></span>
                <span className="na-opcion-txt">
                  <b>Adjuntar foto, video o PDF</b>
                  <small>{archivos.length ? archivos.map((f) => f.name).join(', ') : `Solo si puede hacerlo sin ponerse en riesgo (hasta ${MAX_EVIDENCES} archivos).`}</small>
                </span>
              </label>
              {errors.evidencias && <span className="error" role="alert">{errors.evidencias}</span>}
            </div>

            <div className="barra-accion na-enviar">
              <button type="submit" className="btn red" disabled={saving}><Send />{saving ? 'Enviando…' : forOther ? 'Reportar incidente' : 'Enviar solicitud a la brigada'}</button>
              <small className="na-sub">{forOther ? 'Al enviarlo, la brigada de la zona recibe el reporte.' : 'Al enviarla, la brigada de la zona la recibe y acude a usted.'}</small>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
