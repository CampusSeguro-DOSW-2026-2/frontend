import { useEffect, useState } from 'react';
import { ApiError, errorMessage, type FieldErrors } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventSummary } from '../../ms06-drills/types';
import { scopeLabel } from '../../ms06-drills/utils/labels';
import { campus } from '../../ms02-campus/services/campus';
import type { Espacio } from '../../ms02-campus/types';
import IncidentesEvento from '../components/IncidentesEvento';
import { EVIDENCE_TYPES, MAX_EVIDENCES, brigadesApi, tipoDesdeAlcance } from '../services/brigades';
import { PRIORIDADES, type Incidente } from '../types';
import '../../ms06-drills/styles/events.css';

interface Props {
  session: Session;
  /** Evento elegido desde el panel; sin él se usa el evento en ejecución. */
  eventId?: string;
  /** Brigadista reportando por otra persona (pide el nombre del afectado). */
  forOther?: boolean;
}

const ESTADO_TEXTO: Record<string, string> = {
  REPORTADO: 'Su solicitud quedó registrada. La coordinación ya la recibió y asignará un brigadista.',
  ASIGNADO: 'Su solicitud quedó registrada y la brigada de su zona ya fue avisada. Permanezca en un lugar seguro.',
};

/** RF-BEI-04 y RF-BEI-05: "Necesito ayuda" (solicitud propia) y "Reportar incidente" (brigadista, para otra persona). */
export default function ReportarIncidente({ session, eventId, forOther = false }: Props) {
  const [event, setEvent] = useState<EventSummary | null | undefined>(undefined);
  const [ubicacion, setUbicacion] = useState('');
  // Lugar exacto dentro del edificio (MS02). Si no hay espacios o MS02 no responde, no se muestra.
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [prioridad, setPrioridad] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [afectado, setAfectado] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ incidente: Incidente; fallidas: string[] } | null>(null);

  useEffect(() => {
    eventsApi.active(session)
      .then((list) => setEvent((eventId ? list.find((e) => e.id === eventId) : list[0]) ?? null))
      .catch((err) => { setMessage(errorMessage(err)); setEvent(null); });
  }, [session, eventId]);

  useEffect(() => {
    const zona = event?.scope.find((s) => s.id === ubicacion);
    if (!zona || zona.type !== 'BUILDING') return;
    let ignore = false;
    campus.espacios.listarPorEdificio(zona.id)
      .then((lista) => {
        if (ignore) return;
        const ordenados = [...lista].sort((a, b) => (a.pisoNumero ?? 0) - (b.pisoNumero ?? 0) || a.nombre.localeCompare(b.nombre, 'es'));
        setEspacios(ordenados);
      })
      .catch(() => { if (!ignore) setEspacios([]); });
    return () => { ignore = true; };
  }, [event, ubicacion]);

  const elegirUbicacion = (id: string) => {
    setUbicacion(id);
    setEspacios([]);
    setEspacioId('');
    setErrors((e) => ({ ...e, ubicacion: undefined }));
  };

  const etiquetaEspacio = (e: Espacio) => `${e.pisoNumero !== undefined ? `Piso ${e.pisoNumero} · ` : ''}${e.nombre}`;

  const elegirArchivos = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    const invalid = list.find((f) => !EVIDENCE_TYPES.includes(f.type));
    if (invalid) { setErrors((e) => ({ ...e, evidencias: `"${invalid.name}" no es png, pdf ni mp4.` })); return; }
    if (list.length > MAX_EVIDENCES) { setErrors((e) => ({ ...e, evidencias: `Máximo ${MAX_EVIDENCES} archivos.` })); return; }
    setErrors((e) => ({ ...e, evidencias: undefined }));
    setArchivos(list);
  };

  const enviar = async () => {
    if (!event) return;
    const local: FieldErrors = {};
    if (!ubicacion) local.ubicacion = forOther ? 'Indique dónde está la persona.' : 'Indique dónde se encuentra.';
    if (!prioridad) local.prioridad = 'Seleccione la gravedad.';
    if (forOther && !afectado.trim()) local.nombreAfectado = 'Escriba el nombre de la persona afectada.';
    setErrors(local);
    if (Object.keys(local).length) return;

    const zona = event.scope.find((s) => s.id === ubicacion)!;
    // MS05 registra la ubicación por edificio o zona: el lugar exacto viaja al inicio de la descripción
    const espacio = espacios.find((e) => e.id === espacioId);
    const detalle = [espacio ? `Lugar exacto: ${etiquetaEspacio(espacio)}.` : '', descripcion.trim()].filter(Boolean).join(' ').slice(0, 1000);
    setSaving(true);
    setMessage('');
    try {
      const incidente = await brigadesApi.registrarIncidente(session, event.id, {
        prioridadId: prioridad!, ubicacionId: zona.id, tipoUbicacion: tipoDesdeAlcance(zona.type),
        descripcion: detalle || undefined, nombreAfectado: forOther ? afectado.trim() : undefined,
      });
      const fallidas: string[] = [];
      for (const f of archivos) {
        try { await brigadesApi.subirEvidencia(session, event.id, incidente.idIncidente, f); } catch { fallidas.push(f.name); }
      }
      setDone({ incidente, fallidas });
    } catch (err) {
      setMessage(errorMessage(err));
      if (err instanceof ApiError) setErrors(err.fields);
    } finally {
      setSaving(false);
    }
  };

  const back = forOther ? '#/brigadista' : '#/simulacro';
  return (
    <>
      <header className="ev-head" style={forOther ? { background: 'var(--dark)' } : undefined}>
        <div>
          <a className="back" href={back}>← {forOther ? 'Panel de responsabilidades' : 'Inicio'}</a>
          <h1>{forOther ? 'Reportar incidente' : 'Necesito ayuda'}</h1>
          <p>{forOther ? 'Para una persona que no puede pedir ayuda por sí misma.' : 'Indique dónde se encuentra y la gravedad. La solicitud llega a la brigada de su zona.'}</p>
        </div>
      </header>
      <main className="ev-main" style={{ maxWidth: 760 }}>
        {event === undefined && <p className="notice" role="status">Cargando…</p>}
        {event === null && !message && <div className="ev-empty">No hay un evento en ejecución. Las solicitudes de ayuda se habilitan cuando inicia un evento.</div>}
        {message && <p className="notice err" role="alert">{message}</p>}

        {done && (
          <section className="ev-card" role="status" style={{ borderColor: 'var(--blue)' }}>
            <h2>{forOther ? 'Incidente reportado' : 'Solicitud enviada'}</h2>
            <p>{forOther
              ? `Incidente registrado para ${done.incidente.nombreAfectado} (${done.incidente.estado === 'ASIGNADO' ? 'asignado a la brigada de la zona' : 'pendiente de asignar'}).`
              : ESTADO_TEXTO[done.incidente.estado] ?? `Estado: ${done.incidente.estado}.`}</p>
            {done.fallidas.length > 0 && <p className="error">No se pudieron subir: {done.fallidas.join(', ')}.</p>}
            <a className="btn white" href={back}>Volver</a>
          </section>
        )}

        {event && !done && (
          <form className="ev-fields" noValidate onSubmit={(e) => { e.preventDefault(); enviar(); }}>
            <span className="help">Evento: <b>{event.name}</b></span>
            {forOther && (
              <div className="field">
                <label htmlFor="afectado">Persona afectada <span className="req">*</span></label>
                <div className={`input${errors.nombreAfectado ? ' bad' : ''}`}><input id="afectado" maxLength={150} value={afectado} onChange={(e) => setAfectado(e.target.value)} /></div>
                {errors.nombreAfectado && <span className="error" role="alert">{errors.nombreAfectado}</span>}
              </div>
            )}
            <fieldset className="ev-box">
              <legend className="lbl">¿Dónde {forOther ? 'está la persona' : 'se encuentra'}? <span className="req">*</span></legend>
              <div className="pills">
                {event.scope.map((s) => (
                  <button key={s.id} type="button" className="pill" aria-pressed={ubicacion === s.id} onClick={() => elegirUbicacion(s.id)}>{scopeLabel(s.id)}</button>
                ))}
              </div>
              {errors.ubicacion && <span className="error" role="alert">{errors.ubicacion}</span>}
              {espacios.length > 0 && (
                <div className="field" style={{ marginTop: 10 }}>
                  <label htmlFor="espacio">Lugar exacto</label>
                  <select id="espacio" value={espacioId} onChange={(e) => setEspacioId(e.target.value)}
                    style={{ font: 'inherit', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)' }}>
                    <option value="">Sin precisar</option>
                    {espacios.map((e) => <option key={e.id} value={e.id}>{etiquetaEspacio(e)}</option>)}
                  </select>
                  <span className="help">Opcional. Ayuda a la brigada a llegar más rápido.</span>
                </div>
              )}
            </fieldset>
            <fieldset className="ev-box">
              <legend className="lbl">Gravedad <span className="req">*</span></legend>
              {PRIORIDADES.map((p) => (
                <button key={p.id} type="button" className="pill" aria-pressed={prioridad === p.id}
                  style={{ textAlign: 'left', padding: '12px 14px', fontSize: 14 }} onClick={() => { setPrioridad(p.id); setErrors((e) => ({ ...e, prioridad: undefined })); }}>
                  <b>{p.label}</b> · {p.help}
                </button>
              ))}
              {errors.prioridad && <span className="error" role="alert">{errors.prioridad}</span>}
            </fieldset>
            <div className="field">
              <label htmlFor="desc">Descripción</label>
              <div className="input area"><textarea id="desc" rows={3} maxLength={1000} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
              <span className="help">Opcional</span>
            </div>
            <div className="field">
              <label htmlFor="evid">Evidencia</label>
              <input id="evid" type="file" multiple accept={EVIDENCE_TYPES.join(',')} onChange={(e) => elegirArchivos(e.target.files)} />
              {errors.evidencias
                ? <span className="error" role="alert">{errors.evidencias}</span>
                : <span className="help">Opcional · hasta {MAX_EVIDENCES} archivos png, pdf o mp4{archivos.length ? ` · ${archivos.length} elegidos` : ''}</span>}
            </div>
            <button type="submit" className="btn red" disabled={saving}>{saving ? 'Enviando…' : forOther ? 'Reportar incidente' : 'Enviar solicitud'}</button>
          </form>
        )}

        {event && !forOther && (
          <section className="ev-card">
            <h2>Mis solicitudes</h2>
            <p className="help">Estado de las solicitudes de ayuda que envió en este evento.</p>
            <IncidentesEvento key={done?.incidente.idIncidente ?? 'inicial'} session={session} eventoId={event.id} modo="propias" />
          </section>
        )}
      </main>
    </>
  );
}
