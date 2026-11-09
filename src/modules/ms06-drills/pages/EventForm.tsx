import { useEffect, useState } from 'react';
import { DateTimeField } from '../../../shared/components/DateTimeField';
import { ApiError, errorMessage, type FieldErrors } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { defaultTypeId, eventsApi, isOrganizer } from '../services/events';
import type { EventStatus, ParticipantRole, ScopeItem } from '../types';
import { PARTICIPANT_ROLES, ROLE_LABEL, SCOPE_OPTIONS, STATUS_LABEL, fromLocalInput, scopeLabel, toLocalInput } from '../utils/labels';
import '../styles/events.css';

interface Form { name: string; description: string; start: string; scope: ScopeItem[]; roles: ParticipantRole[] }
const EMPTY: Form = { name: '', description: '', start: '', scope: [], roles: [] };

/**
 * RF-EVE-01 y RF-EVE-02: crear y editar evento en un solo formulario (igual al de crear alerta).
 * Sin fecha, alcance o participantes el evento queda en Borrador; completo queda Programado.
 * No se muestran tipos: se envía el tipo "Simulacro" (decisión del equipo).
 */
export default function EventForm({ session, editId }: { session: Session; editId?: string }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [status, setStatus] = useState<EventStatus | null>(null);
  const [typeIds, setTypeIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    eventsApi.detail(session, editId)
      .then(({ event }) => {
        setForm({
          name: event.name, description: event.description ?? '', start: toLocalInput(event.startDate),
          scope: event.scope, roles: event.participantRoles,
        });
        setStatus(event.status);
        setTypeIds(event.types.map((t) => t.id));
      })
      .catch((err) => setMessage(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [session, editId]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k === 'start' ? 'startDate' : k === 'roles' ? 'participantRoles' : k]: undefined })); };
  // Actualización funcional: dos clics seguidos no deben pisarse con un estado viejo
  const toggleScope = (item: ScopeItem) => {
    setForm((f) => ({ ...f, scope: f.scope.some((s) => s.id === item.id) ? f.scope.filter((s) => s.id !== item.id) : [...f.scope, item] }));
    setErrors((e) => ({ ...e, scope: undefined }));
  };
  const toggleRole = (r: ParticipantRole) => {
    setForm((f) => ({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] }));
    setErrors((e) => ({ ...e, participantRoles: undefined }));
  };

  const complete = !!form.start && form.scope.length > 0 && form.roles.length > 0;
  const willBe: EventStatus = status === 'IN_PROGRESS' ? 'IN_PROGRESS' : complete ? 'SCHEDULED' : 'DRAFT';
  const inProgress = status === 'IN_PROGRESS';
  const finished = status === 'FINISHED';

  const save = async () => {
    const local: FieldErrors = {};
    if (!form.name.trim()) local.name = 'Escribe el nombre del evento.';
    if (form.start && !inProgress && new Date(form.start).getTime() <= Date.now()) local.startDate = 'La fecha de inicio debe ser posterior a la actual.';
    setErrors(local);
    if (Object.keys(local).length) return;

    setSaving(true);
    setMessage('');
    try {
      const ids = typeIds.length ? typeIds : [await defaultTypeId(session)];
      const body = {
        name: form.name.trim(), description: form.description.trim() || null, typeIds: ids,
        startDate: fromLocalInput(form.start), scope: form.scope, participantRoles: form.roles,
      };
      const saved = editId ? await eventsApi.update(session, editId, body) : await eventsApi.create(session, body);
      window.location.hash = `#/eventos/${saved.id}`;
    } catch (err) {
      setMessage(errorMessage(err));
      if (err instanceof ApiError) setErrors(err.fields);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="ev-main"><p className="notice" role="status">Cargando evento…</p></main>;

  return (
    <>
      <header className="ev-head">
        <div>
          <a className="back" href="#/eventos">← Eventos</a>
          <h1>{editId ? 'Editar evento' : 'Crear evento'}</h1>
          <p>{inProgress
            ? 'El evento está en ejecución: al guardar se reenvían las alertas a brigadistas y participantes.'
            : `${editId ? '' : isOrganizer(session) ? 'Se creará como simulacro. ' : 'Se creará como evento real. '}Con fecha, alcance y participantes completos queda Programado; si falta alguno, se guarda como Borrador.`}</p>
        </div>
      </header>
      <main className="ev-form">
        <form className="ev-fields" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
          {finished && <p className="notice err" role="alert">Un evento Finalizado no se puede editar.</p>}
          {inProgress && (
            <div className="ev-warn" role="note"><b>El evento está en ejecución.</b> Si cambias el alcance, los brigadistas deberán confirmar su zona y se avisará a los participantes nuevos.</div>
          )}
          <div className="field">
            <label htmlFor="ev-name">Nombre del evento <span className="req">*</span></label>
            <div className={`input${errors.name ? ' bad' : ''}`}><input id="ev-name" maxLength={150} value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            {errors.name && <span className="error" role="alert">{errors.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="ev-desc">Descripción</label>
            <div className={`input area${errors.description ? ' bad' : ''}`}><textarea id="ev-desc" rows={3} maxLength={1000} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
            <span className="help">{form.description.length}/1000 · opcional</span>
          </div>
          <div className="field">
            <label htmlFor="ev-start">Inicio</label>
            <DateTimeField id="ev-start" value={form.start} onChange={(v) => set('start', v)} invalid={!!errors.startDate} disabled={inProgress} placeholder="Opcional: sin fecha queda en Borrador" />
            {errors.startDate
              ? <span className="error" role="alert">{errors.startDate}</span>
              : <span className="help">A esta hora inicia el evento y se avisa a los participantes.</span>}
          </div>
          <div className="two">
            <fieldset className="ev-box" style={{ flex: 1 }}>
              <legend className="lbl">Edificios y zonas</legend>
              <div className="pills">
                {SCOPE_OPTIONS.map((o) => (
                  <button key={o.id} type="button" className="pill" aria-pressed={form.scope.some((s) => s.id === o.id)} onClick={() => toggleScope(o)}>{scopeLabel(o.id)}</button>
                ))}
              </div>
              {errors.scope && <span className="error" role="alert">{errors.scope}</span>}
            </fieldset>
            <fieldset className="ev-box" style={{ flex: 1 }}>
              <legend className="lbl">Participantes</legend>
              <div className="pills">
                {PARTICIPANT_ROLES.map((r) => (
                  <button key={r} type="button" className="pill" aria-pressed={form.roles.includes(r)} onClick={() => toggleRole(r)}>{ROLE_LABEL[r]}</button>
                ))}
              </div>
              {errors.participantRoles && <span className="error" role="alert">{errors.participantRoles}</span>}
            </fieldset>
          </div>
          <div className="ev-info" role="note">
            <span><b>Brigada:</b> no se asigna aquí. Cuando el evento quede Programado, los brigadistas reciben una alerta, se activan y eligen la zona donde apoyarán.</span>
          </div>
        </form>
        <aside className="ev-side">
          <div className="ev-sum">
            <h2>Resumen</h2>
            <small>Cuándo</small><b>{form.start ? new Date(form.start).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'}</b>
            <small>Alcance</small><b>{form.scope.length ? form.scope.map((s) => scopeLabel(s.id)).join(', ') : 'Sin alcance'}</b>
            <small>Participantes</small><b>{form.roles.length ? form.roles.map((r) => ROLE_LABEL[r]).join(', ') : 'Sin participantes'}</b>
            <div className="sep" />
            <div className="row"><span>{inProgress ? 'Sigue en' : 'Quedará como'}</span><span className={`st ${willBe}`}>{STATUS_LABEL[willBe]}</span></div>
          </div>
          {message && <p className="notice err" role="alert">{message}</p>}
          <div className="actions">
            <button type="button" className="btn red" onClick={save} disabled={saving || finished}>{saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Guardar evento'}</button>
            <a className="btn white" href={editId ? `#/eventos/${editId}` : '#/eventos'}>Cancelar</a>
          </div>
        </aside>
      </main>
    </>
  );
}
