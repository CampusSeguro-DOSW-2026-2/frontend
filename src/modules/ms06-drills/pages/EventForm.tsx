import { useEffect, useMemo, useState } from 'react';
import { DateTimeField } from '../../../shared/components/DateTimeField';
import { ApiError, errorMessage, type FieldErrors } from '../../../shared/services/http';
import { FilePen, Info } from '../../../shared/components/Icons';
import { PickerBox } from '../../ms03-alerts/components/PickerBox';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { labelOf, listEs, type CatalogItem } from '../../ms03-alerts/services/catalog';
import type { Session } from '../../../shared/types';
import { defaultTypeId, eventsApi, isOrganizer } from '../services/events';
import type { EventStatus, EventType, ParticipantRole, ScopeItem } from '../types';
import { PARTICIPANT_ROLE_ITEMS, STATUS_LABEL, fromLocalInput, scopeLabel, toLocalInput } from '../utils/labels';
import '../styles/events.css';

interface Form { name: string; description: string; start: string; scope: ScopeItem[]; roles: ParticipantRole[] }
const EMPTY: Form = { name: '', description: '', start: '', scope: [], roles: [] };

/**
 * RF-EVE-01 y RF-EVE-02: crear y editar evento en un solo formulario (igual al de crear alerta).
 * Sin fecha, alcance o participantes el evento queda en Borrador; completo queda Programado.
 * El tipo se elige junto al inicio, como en alertas: el organizador crea simulacros (el tipo Simulacro queda fijo)
 * y el coordinador eventos reales (sin Simulacro). Un evento de un tipo no pasa al otro al editarlo.
 */
export default function EventForm({ session, editId }: { session: Session; editId?: string }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [status, setStatus] = useState<EventStatus | null>(null);
  const [typeIds, setTypeIds] = useState<string[]>([]);
  // Event types of the MS06 catalog. A drill (type SIMULACRO) and a real event cannot turn into each other.
  const [catalogTypes, setCatalogTypes] = useState<EventType[]>([]);
  const [knownTypes, setKnownTypes] = useState<EventType[]>([]);
  const [isDrill, setIsDrill] = useState(isOrganizer(session));
  const [typesError, setTypesError] = useState('');
  const [typesAttempt, setTypesAttempt] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  // Buildings and zones come from MS02: MS06 validates these same UUIDs when the event is saved.
  const { catalog, loading: scopeLoading, error: scopeError, retry: retryScope } = useScopeCatalog();
  const scopeItems = useMemo<CatalogItem[]>(() => {
    const live = catalog ? [...catalog.buildings, ...catalog.zones] : [];
    // Ids already in the event that MS02 no longer lists (inactive or old demo ids) stay visible so they can be removed.
    const extra = form.scope
      .filter((s) => !live.some((i) => i.id === s.id))
      .map((s) => ({ id: s.id, label: scopeLabel(s.id), group: 'Fuera del catálogo' }));
    return [...live, ...extra];
  }, [catalog, form.scope]);

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
        setKnownTypes(event.types);
        setIsDrill(event.simulacro);
      })
      .catch((err) => setMessage(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [session, editId]);

  useEffect(() => {
    let ignore = false;
    eventsApi.types(session)
      .then((list) => { if (!ignore) setCatalogTypes(list.filter((t) => t.active)); })
      .catch(() => { if (!ignore) setTypesError('No se pudieron cargar los tipos de evento.'); });
    return () => { ignore = true; };
  }, [session, typesAttempt]);

  // A drill always carries SIMULACRO and a real event never offers it.
  const typeItems = useMemo<CatalogItem[]>(() => {
    const byId = new Map<string, EventType>();
    [...catalogTypes, ...knownTypes].forEach((t) => byId.set(t.id, t));
    return [...byId.values()]
      .filter((t) => (isDrill ? true : t.code !== 'SIMULACRO'))
      .map((t) => ({ id: t.id, label: t.name, group: t.code === 'SIMULACRO' ? 'Simulacro' : 'Emergencia' }));
  }, [catalogTypes, knownTypes, isDrill]);
  const drillTypeId = catalogTypes.concat(knownTypes).find((t) => t.code === 'SIMULACRO')?.id;

  // New event: start with the type that matches the role (Simulacro for the organizer, Otro for the coordinator).
  useEffect(() => {
    if (editId || typeIds.length || !catalogTypes.length) return;
    const first = catalogTypes.find((t) => t.code === (isDrill ? 'SIMULACRO' : 'OTRO'));
    if (first) setTypeIds([first.id]);
  }, [editId, typeIds.length, catalogTypes, isDrill]);

  const toggleType = (id: string) => {
    if (id === drillTypeId && isDrill) return; // SIMULACRO is what makes it a drill: it stays selected
    setTypeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? cur : [...cur, id]));
    setErrors((e) => ({ ...e, typeIds: undefined }));
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k === 'start' ? 'startDate' : k === 'roles' ? 'participantRoles' : k]: undefined })); };
  // Actualización funcional: dos clics seguidos no deben pisarse con un estado viejo
  const toggleScope = (id: string) => {
    const type: ScopeItem['type'] = catalog?.zones.some((z) => z.id === id) ? 'ZONE' : 'BUILDING';
    setForm((f) => ({ ...f, scope: f.scope.some((s) => s.id === id) ? f.scope.filter((s) => s.id !== id) : [...f.scope, { type, id }] }));
    setErrors((e) => ({ ...e, scope: undefined }));
  };
  const toggleRole = (id: string) => {
    const r = id as ParticipantRole;
    setForm((f) => ({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] }));
    setErrors((e) => ({ ...e, participantRoles: undefined }));
  };

  const complete = !!form.start && form.scope.length > 0 && form.roles.length > 0;
  const willBe: EventStatus = status === 'IN_PROGRESS' ? 'IN_PROGRESS' : complete ? 'SCHEDULED' : 'DRAFT';
  const inProgress = status === 'IN_PROGRESS';
  const finished = status === 'FINISHED';

  const save = async () => {
    const local: FieldErrors = {};
    if (!form.name.trim()) local.name = 'Escriba el nombre del evento.';
    if (!typeIds.length && catalogTypes.length) local.typeIds = 'Seleccione al menos un tipo.';
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

  // Finish the event from the summary card. The backend only accepts it while the event is in progress.
  const finish = async () => {
    if (!editId) return;
    setFinishing(true);
    setMessage('');
    try {
      await eventsApi.finish(session, editId);
      window.location.hash = `#/eventos/${editId}`;
    } catch (err) {
      setMessage(errorMessage(err));
      setConfirmFinish(false);
    } finally {
      setFinishing(false);
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
          <div className="two">
            <div className="field">
              <label htmlFor="ev-start">Inicio</label>
              <DateTimeField id="ev-start" value={form.start} onChange={(v) => set('start', v)} invalid={!!errors.startDate} disabled={inProgress} placeholder="Opcional: sin fecha queda en Borrador" />
              {errors.startDate
                ? <span className="error" role="alert">{errors.startDate}</span>
                : <span className="help">A esta hora inicia el evento y se avisa a los participantes.</span>}
            </div>
            <PickerBox label="Tipo de evento" help={isDrill ? 'El simulacro siempre lleva su tipo; puede sumar hasta 3 más.' : 'Elija hasta 4 tipos de emergencia.'}
              editLabel="Editar tipo" items={typeItems} selected={typeIds} onToggle={toggleType} error={errors.typeIds} loading={!typeItems.length && !typesError} />
          </div>
          {typesError && (
            <p className="notice err" role="alert">
              {typesError} <button type="button" className="plink" onClick={() => { setTypesError(''); setTypesAttempt((n) => n + 1); }}>Reintentar</button>
            </p>
          )}
          <div className="fgroup">
            <span className="flabel">Alcance y participantes</span>
            <div className="two">
              <PickerBox label="Edificios y zonas" help="El evento se realizará en los lugares seleccionados." editLabel="Editar edificios y zonas"
                items={scopeItems} selected={form.scope.map((s) => s.id)} onToggle={toggleScope} error={errors.scope} loading={scopeLoading} />
              <PickerBox label="Participantes" help="Grupos que serán convocados a este evento." editLabel="Editar participantes"
                items={PARTICIPANT_ROLE_ITEMS} selected={form.roles} onToggle={toggleRole} error={errors.participantRoles} />
            </div>
            {scopeError && (
              <p className="notice err" role="alert">
                {scopeError} <button type="button" className="plink" onClick={retryScope}>Reintentar</button>
              </p>
            )}
          </div>
          <div className="ev-info" role="note">
            <span><b>Brigada:</b> no se asigna aquí. Cuando el evento quede Programado, los brigadistas reciben una alerta, se activan y eligen la zona donde apoyarán.</span>
          </div>
        </form>
        <aside className="ev-side">
          <div className="sum2">
            <div className="sum2-head">
              <h2>Resumen del evento</h2>
              <span className="unsent"><FilePen />{editId && status ? STATUS_LABEL[status] : 'Sin guardar'}</span>
            </div>
            <div className="sum2-msg">
              <small>Nombre del evento</small>
              <strong>{form.name.trim() || 'Pendiente de completar'}</strong>
              <p className="clamp">{form.description.trim() || 'Agregue la descripción que verán los participantes.'}</p>
            </div>
            <div className="sep" />
            <div className="sum2-row"><small>Tipo</small><span>{typeIds.length ? listEs(typeIds.map((t) => labelOf(typeItems, t))) : '—'}</span></div>
            <div className="sum2-row"><small>Inicio</small><span>{form.start ? new Date(form.start).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span></div>
            <div className="sum2-row"><small>Edificios y zonas</small><span>{form.scope.length ? form.scope.map((s) => labelOf(scopeItems, s.id)).join(' · ') : '—'}</span></div>
            <div className="sum2-row"><small>Participantes</small><span>{form.roles.length ? listEs(form.roles.map((r) => labelOf(PARTICIPANT_ROLE_ITEMS, r))) : '—'}</span></div>
            <div className="sep" />
            <div className="sum2-row"><small>{inProgress ? 'Sigue en' : 'Quedará como'}</small><span><span className={`st ${willBe}`}>{STATUS_LABEL[willBe]}</span></span></div>
          </div>
          <div className="notice2"><Info /><div><b>Programar avisará a los brigadistas</b>
            <p>Con fecha, alcance y participantes completos el evento queda Programado. Si falta alguno, se guarda como Borrador y no se envía ningún aviso.</p></div></div>
          {message && <p className="notice err" role="alert">{message}</p>}
          <div className="actions">
            <button type="button" className="btn red" onClick={save} disabled={saving || finished}>{saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Guardar evento'}</button>
            <a className="btn white" href={editId ? `#/eventos/${editId}` : '#/eventos'}>Cancelar</a>
          </div>
          {editId && !finished && (
            <div className="actions">
              {confirmFinish ? (
                <>
                  <button type="button" className="btn red" onClick={finish} disabled={finishing}>{finishing ? 'Finalizando…' : 'Sí, finalizar'}</button>
                  <button type="button" className="btn white" onClick={() => setConfirmFinish(false)} disabled={finishing}>No</button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn light"
                  onClick={() => setConfirmFinish(true)}
                  disabled={!inProgress || saving}
                  title={inProgress ? undefined : 'Solo se puede finalizar un evento en ejecución'}
                >Finalizar evento</button>
              )}
            </div>
          )}
          {editId && !finished && !inProgress && <span className="help">Finalizar solo está disponible cuando el evento está en ejecución.</span>}
        </aside>
      </main>
    </>
  );
}
