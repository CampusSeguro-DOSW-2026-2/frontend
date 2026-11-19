import { useEffect, useState } from 'react';
import { Info, Send } from '../../../shared/components/Icons';
import { PageHeader } from '../../../shared/components/Layout';
import { ApiError, errorMessage, type FieldErrors } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import { PERMISSION } from '../../../shared/permissions';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventSummary } from '../../ms06-drills/types';
import { scopeLabelIn } from '../../ms06-drills/utils/labels';
import { EVIDENCE_TYPES, MAX_EVIDENCES, brigadesApi, tipoDesdeAlcance } from '../services/brigades';
import { PRIORIDADES, type Incidente } from '../types';
import '../styles/respuesta.css';

interface Props {
  session: Session;
  /** Evento elegido desde el panel; sin él se usa el evento en ejecución. */
  eventId?: string;
  /** Brigadista reportando por otra persona (pide el nombre del afectado). */
  forOther?: boolean;
}

type Prioridad = (typeof PRIORIDADES)[number];

const ESTADO_TEXTO: Record<string, string> = {
  REPORTADO: 'Tu solicitud quedó registrada. La coordinación ya la recibió y asignará un brigadista.',
  ASIGNADO: 'Tu solicitud quedó registrada y la brigada de tu zona ya fue avisada. Permanece en un lugar seguro.',
};

/**
 * RF-BEI-04 y RF-BEI-05: "Necesito ayuda" (solicitud propia) y "Reportar incidente" (brigadista, para otra persona).
 * Dos pasos, como el mockup: primero la prioridad y luego la zona, con descripción y evidencia opcionales. Las zonas son
 * el alcance del evento (MS06) y sus nombres salen del catálogo vivo de MS02, porque el evento solo guarda los ids.
 */
export default function ReportarIncidente({ session, eventId, forOther = false }: Props) {
  const [event, setEvent] = useState<EventSummary | null | undefined>(undefined);
  const [paso, setPaso] = useState<'prioridad' | 'zona'>('prioridad');
  const [ubicacion, setUbicacion] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [afectado, setAfectado] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ incidente: Incidente; fallidas: string[] } | null>(null);
  // Nombres de edificios y zonas (MS02): el alcance del evento trae solo sus ids
  const { catalog, loading: cargandoNombres } = useScopeCatalog();

  useEffect(() => {
    eventsApi.active(session)
      .then((list) => setEvent((eventId ? list.find((e) => e.id === eventId) : list[0]) ?? null))
      .catch((err) => { setMessage(errorMessage(err)); setEvent(null); });
  }, [session, eventId]);

  const nombre = (id: string) => (cargandoNombres ? 'Cargando…' : scopeLabelIn(id, catalog));

  const elegirArchivos = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    const invalid = list.find((f) => !EVIDENCE_TYPES.includes(f.type));
    if (invalid) { setErrors((e) => ({ ...e, evidencias: `"${invalid.name}" no es png, pdf ni mp4.` })); return; }
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
    if (!ubicacion) local.ubicacion = forOther ? 'Indica dónde está la persona.' : 'Selecciona la zona donde te encuentras.';
    if (forOther && !afectado.trim()) local.nombreAfectado = 'Escribe el nombre de la persona afectada.';
    setErrors(local);
    if (Object.keys(local).length) return;

    const zona = event.scope.find((s) => s.id === ubicacion)!;
    setSaving(true);
    setMessage('');
    try {
      const incidente = await brigadesApi.registrarIncidente(session, event.id, {
        prioridadId: prioridad.id, ubicacionId: zona.id, tipoUbicacion: tipoDesdeAlcance(zona.type),
        descripcion: descripcion.trim() || undefined, nombreAfectado: forOther ? afectado.trim() : undefined,
      });
      const fallidas: string[] = [];
      for (const f of archivos) {
        try { await brigadesApi.subirEvidencia(session, event.id, incidente.idIncidente, f); } catch { fallidas.push(f.name); }
      }
      setDone({ incidente, fallidas });
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

  const back = forOther ? '#/brigadista/incidentes' : '#/checkin';
  const enZona = paso === 'zona' && prioridad !== null;
  const header = enZona
    ? { badge: 'ZONA Y DETALLES', title: forOther ? '¿Dónde está la persona?' : '¿Dónde necesitas ayuda?', subtitle: forOther ? 'Selecciona la zona donde está la persona afectada.' : 'Selecciona tu zona. Puedes enviar la solicitud sin descripción ni evidencia.' }
    : { badge: 'PRIORIDAD', title: forOther ? 'Reportar incidente' : '¿Qué tan urgente es?', subtitle: forOther ? 'Para una persona que no puede pedir ayuda por sí misma.' : 'Selecciona la prioridad. La solicitud llega a la brigada de tu zona.' };

  return (
    <>
      <PageHeader badge={header.badge} title={header.title} subtitle={header.subtitle} context={event ? event.name : undefined} />
      <main className="rs-main">
        {enZona
          ? <button type="button" className="rs-back" onClick={() => setPaso('prioridad')}>← Volver a seleccionar prioridad</button>
          : <a className="rs-back" href={back}>← {forOther ? 'Volver al panel brigadista' : 'Volver al evento'}</a>}

        {event === undefined && <p className="notice" role="status">Cargando…</p>}
        {event === null && !message && <div className="rs-card rs-empty">No hay un evento en ejecución. Las solicitudes de ayuda se habilitan cuando inicia un evento.</div>}
        {message && <p className="notice err" role="alert">{message}</p>}

        {done && (
          <section className="rs-card" role="status">
            <h2>{forOther ? 'Incidente reportado' : 'Solicitud enviada'}</h2>
            <p>{forOther
              ? `Incidente registrado para ${done.incidente.nombreAfectado} (${done.incidente.estado === 'ASIGNADO' ? 'asignado a la brigada de la zona' : 'pendiente de asignar'}).`
              : ESTADO_TEXTO[done.incidente.estado] ?? `Estado: ${done.incidente.estado}.`}</p>
            {done.fallidas.length > 0 && <p className="error">No se pudieron subir: {done.fallidas.join(', ')}.</p>}
            <div className="rs-detail-acts" style={{ justifyContent: 'flex-start' }}>
              {!forOther && hasPermission(session, PERMISSION.MS05_INCIDENT_MANAGE_OWN) && <a className="btn red rs-btn rs-report" href="#/mis-incidentes">Ver mis incidentes</a>}
              <a className="btn white rs-btn rs-report" href={back}>Volver</a>
            </div>
          </section>
        )}

        {event && !done && !enZona && (
          <section className="rs-card" aria-labelledby="rs-prio-titulo">
            <h2 id="rs-prio-titulo">Prioridad</h2>
            <p className="rs-sub">Elige la opción que mejor describe la situación.</p>
            <div className="rs-prios" role="group" aria-label="Prioridad">
              {PRIORIDADES.map((p) => (
                <button key={p.id} type="button" className="rs-prio-card" aria-pressed={prioridad?.id === p.id} onClick={() => elegirPrioridad(p)}>
                  <span className={`rs-prio ${p.codigo}`}>{p.label}</span>
                  <b>{p.label}</b>
                  <span>{p.help}</span>
                </button>
              ))}
            </div>
            {errors.prioridad && <span className="error" role="alert">{errors.prioridad}</span>}
          </section>
        )}

        {event && !done && enZona && prioridad && (
          <form className="rs-grid" noValidate onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
            <section className="rs-card rs-col">
              {forOther && (
                <div className="rs-sec">
                  <h3><label htmlFor="afectado">Persona afectada</label></h3>
                  <div className={`input${errors.nombreAfectado ? ' bad' : ''}`}><input id="afectado" maxLength={150} value={afectado} onChange={(e) => setAfectado(e.target.value)} /></div>
                  {errors.nombreAfectado && <span className="error" role="alert">{errors.nombreAfectado}</span>}
                </div>
              )}
              <div className="rs-sec">
                <h3 id="rs-zona-titulo">Zona del incidente</h3>
                <p className="rs-sub">{forOther ? 'Selecciona el bloque donde está la persona.' : 'Selecciona el bloque donde te encuentras.'}</p>
                <div className="rs-zonas" role="group" aria-labelledby="rs-zona-titulo">
                  {event.scope.map((s) => (
                    <button key={s.id} type="button" className="rs-zona" aria-pressed={ubicacion === s.id}
                      onClick={() => { setUbicacion(s.id); setErrors((e) => ({ ...e, ubicacion: undefined })); }}>
                      {nombre(s.id)}{ubicacion === s.id && ' ✓'}
                    </button>
                  ))}
                </div>
                {event.scope.length === 0 && <p className="rs-sub">El evento no tiene zonas definidas.</p>}
                {errors.ubicacion
                  ? <span className="error" role="alert">{errors.ubicacion}</span>
                  : ubicacion && <span className="rs-ok">Zona seleccionada: {nombre(ubicacion)}</span>}
              </div>
              <div className="rs-sec">
                <h3><label htmlFor="desc">Descripción</label> <span className="rs-opt">Opcional</span></h3>
                <div className="input area"><textarea id="desc" rows={3} maxLength={1000} placeholder="Describe qué ocurrió o indica el piso y un punto de referencia…" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
                {errors.descripcion && <span className="error" role="alert">{errors.descripcion}</span>}
              </div>
              <div className="rs-sec">
                <h3>Evidencia <span className="rs-opt">Opcional</span></h3>
                <label className="rs-drop">
                  <input type="file" multiple accept={EVIDENCE_TYPES.join(',')} onChange={(e) => elegirArchivos(e.target.files)} />
                  <span>
                    <b>Adjuntar evidencia</b>
                    <small>{archivos.length ? archivos.map((f) => f.name).join(', ') : 'Ningún archivo adjunto'}</small>
                  </span>
                  <span className="rs-plus" aria-hidden="true">+</span>
                </label>
                {errors.evidencias
                  ? <span className="error" role="alert">{errors.evidencias}</span>
                  : <span className="rs-sub">Adjunta un archivo solo si puedes hacerlo sin ponerte en riesgo (hasta {MAX_EVIDENCES} archivos png, pdf o mp4).</span>}
              </div>
            </section>

            <aside className="rs-side">
              <section className="rs-card">
                <h2>{forOther ? 'El reporte' : 'Tu solicitud'}</h2>
                <div className="rs-kv">
                  <small>Prioridad seleccionada</small>
                  <span className={`rs-prio ${prioridad.codigo}`}>{prioridad.label}</span>
                </div>
                <button type="button" className="rs-link" onClick={() => setPaso('prioridad')}>Cambiar prioridad</button>
                <div className="rs-kv">
                  <small>Zona</small>
                  <b>{ubicacion ? nombre(ubicacion) : 'Sin seleccionar'}</b>
                </div>
                <p className="rs-sub">La solicitud aún no se ha enviado. Al enviarla, estará disponible para su atención por la brigada.</p>
                <button type="submit" className="btn red rs-btn" disabled={saving}><Send />{saving ? 'Enviando…' : forOther ? 'Reportar incidente' : 'Enviar solicitud'}</button>
              </section>
              <p className="rs-info"><Info /> La zona es necesaria. La descripción y la evidencia son opcionales y no impiden el envío.</p>
            </aside>
          </form>
        )}
      </main>
    </>
  );
}
