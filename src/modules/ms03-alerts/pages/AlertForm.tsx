import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PickerBox } from '../components/PickerBox';
import { DateTimeField } from '../../../shared/components/DateTimeField';
import { FilePen, Info, Send } from '../../../shared/components/Icons';
import { alertsApi, type Alert, type AlertInput, type AlertType, type Recipient, type Scope } from '../services/alerts';
import { ApiError, errorMessage } from '../../../shared/services/http';
import { getSession, sessionPermissions } from '../../../shared/services/session';
import { alertAccess } from '../permissions';
import { useAlertTypes } from '../hooks/useAlertTypes';
import { useRecipientRoles } from '../hooks/useRecipientRoles';
import { useScopeCatalog } from '../hooks/useScopeCatalog';
import { CAMPUS_ITEM, defaultAlertType, labelOf, listEs, roleItem, scopeIdsOf, toggleType } from '../services/catalog';

const toLocalInput = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const msg = errorMessage;

// Errores de MS03 junto a cada campo (details.field viene con nombres del contrato en inglés).
const FIELD: Record<string, [string, string]> = {
  title: ['title', 'Revise el título (obligatorio, máximo 150 caracteres).'],
  instructions: ['instructions', 'Revise la descripción (obligatoria, máximo 1000 caracteres).'],
  scope: ['scope', 'Revise los edificios y zonas seleccionados.'],
  recipients: ['roles', 'Revise los destinatarios seleccionados.'],
  destinatarios: ['roles', 'Revise los destinatarios seleccionados.'],
  alcance: ['scope', 'Revise los edificios y zonas seleccionados.'],
  types: ['types', 'Seleccione al menos un tipo de alerta.'],
  tipos: ['types', 'Seleccione al menos un tipo de alerta.'],
  activationAt: ['start', 'Debe ser una fecha futura'],
};
const fieldErrors = (e: ApiError) => {
  const out: Record<string, string> = {};
  if (e.code === 'FECHA_ACTIVACION_INVALIDA') out.start = FIELD.activationAt[1];
  for (const d of e.details) {
    const f = FIELD[d.campo.split(/[.[]/)[0]];
    if (f) out[f[0]] = f[1];
  }
  return out;
};

export default function AlertForm({ editId }: { editId?: string }) {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [start, setStart] = useState('');
  // El alcance sale de MS02: MS03 valida esos mismos ids por UUID al crear la alerta.
  const { catalog, loading: scopeLoading, error: scopeError, retry: retryScope } = useScopeCatalog();
  const { items: loadedRoles, loading: rolesLoading, error: rolesError, notice: rolesNotice, retry: retryRoles } = useRecipientRoles();
  // Los tipos de alerta salen de MS03: MS06 es el dueño del catálogo y MS03 agrega OPERATIVA.
  const { items: typeItems, loading: typesLoading, error: typesError, notice: typesNotice, retry: retryTypes } = useAlertTypes();
  const scopeItems = useMemo(
    () => [CAMPUS_ITEM, ...(catalog ? [...catalog.buildings, ...catalog.zones] : [])],
    [catalog],
  );
  const kindOf = (id: string): Scope['type'] =>
    id === 'CAMPUS' ? 'CAMPUS' : catalog?.buildings.some((building) => building.id === id) ? 'BUILDING' : 'ZONE';
  const [scopeIds, setScopeIds] = useState<string[]>([]);
  const [scopeType, setScopeType] = useState<Scope['type'] | null>(null);
  // Tipos de alcance distintos que trae la alerta: el formulario y el PUT solo manejan uno a la vez.
  const [scopeKinds, setScopeKinds] = useState(0);
  const [roles, setRoles] = useState<string[]>([]);
  const [types, setTypes] = useState<AlertType[]>([]);
  // Destinatarios individuales (USER) que pudo fijar otro servicio: se conservan al editar.
  const [users, setUsers] = useState<Recipient[]>([]);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  // Las opciones de destinatario salen de MS01. Un rol que la alerta ya tiene guardado se muestra aunque MS01 deje de
  // devolverlo (renombrado o sin ms03:alert:receive), para que se vea y se pueda quitar.
  const roleItems = useMemo(
    () => [...loadedRoles, ...roles.filter((role) => !loadedRoles.some((item) => item.id === role)).map(roleItem)],
    [loadedRoles, roles],
  );

  useEffect(() => {
    if (!editId) return;
    alertsApi.get(editId).then((a) => {
      setAlert(a); setTitle(a.title); setInstructions(a.instructions);
      // MS03 manda scope en null cuando la alerta cubre varios tipos de alcance; la lista completa va en scopes.
      const scopes = a.scopes?.length ? a.scopes : a.scope ? [a.scope] : [];
      const first = scopes[0] ?? null;
      setScopeKinds(new Set(scopes.map((s) => s.type)).size);
      setScopeType(first ? first.type : null);
      setScopeIds(first ? scopeIdsOf(first) : []);
      setRoles(a.recipients.filter((r) => r.type === 'ROLE').map((r) => r.id));
      setUsers(a.recipients.filter((r) => r.type === 'USER')); setTypes(a.types);
      if (a.activationAt) setStart(toLocalInput(a.activationAt));
    }).catch((e) => setApiError(msg(e))).finally(() => setLoading(false));
  }, [editId]);

  // Al crear, el tipo por defecto se deduce del catálogo de MS03 (prefiere OTRO) una sola vez, cuando llega.
  // No se vuelve a aplicar si el usuario vacía la selección a propósito.
  const defaulted = useRef(false);
  useEffect(() => {
    if (defaulted.current || editId || !typeItems.length) return;
    defaulted.current = true;
    setTypes((current) => (current.length ? current : [defaultAlertType(typeItems)]));
  }, [editId, typeItems]);

  const access = alertAccess(sessionPermissions(getSession()));
  const status = alert?.status;
  const scheduled = status === 'SCHEDULED';
  const blocked = !!alert && status !== 'DRAFT' && !scheduled;
  const forbidden = editId ? !!alert && !access.canManage(alert.origin) : !access.canCreate;

  // Una alerta admite un solo tipo de alcance: cambiar de edificio a zona (o a campus) reinicia la selección.
  const toggleScope = (id: string) => {
    if (id === 'CAMPUS') {
      const selected = scopeType === 'CAMPUS' && scopeIds.includes('CAMPUS');
      setScopeType(selected ? null : 'CAMPUS');
      setScopeIds(selected ? [] : ['CAMPUS']);
      return;
    }
    const kind = kindOf(id);
    if (kind !== scopeType) { setScopeType(kind); setScopeIds([id]); return; }
    setScopeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };
  const toggleRole = (id: string) => setRoles((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const validate = () => {
    const e: Record<string, string> = {}; const req = 'Campo obligatorio';
    if (!title.trim()) e.title = req; else if (title.length > 150) e.title = 'Máximo 150 caracteres';
    if (!instructions.trim()) e.instructions = req; else if (instructions.length > 1000) e.instructions = 'Máximo 1000 caracteres';
    if (!scopeIds.length) e.scope = 'Seleccione al menos un lugar.';
    if (!types.length) e.types = 'Seleccione al menos un tipo.';
    if (!roles.length && !users.length) e.roles = 'Seleccione al menos un grupo.';
    if (start && !scheduled && new Date(start).getTime() <= Date.now()) e.start = 'Debe ser una fecha futura';
    return e;
  };

  const submit = async () => {
    const e = validate(); setErrors(e); setApiError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    const t = scopeIds[0] === 'CAMPUS' ? 'CAMPUS' : scopeType ?? kindOf(scopeIds[0]);
    const payload: AlertInput = {
      types, title: title.trim(), instructions: instructions.trim(),
      scope: t === 'CAMPUS' ? { type: 'CAMPUS' } : { type: t, ids: scopeIds },
      recipients: [...users, ...roles.map((id) => ({ type: 'ROLE' as const, id }))],
    };
    const activationAt = start ? new Date(start).toISOString() : undefined;
    try {
      if (!editId) {
        // Una sola llamada: con fecha queda programada; sin fecha se emite de inmediato.
        await alertsApi.create(activationAt ? { ...payload, activationAt } : { ...payload, activateImmediately: true });
      } else {
        await alertsApi.update(editId, payload);
        if (!scheduled && activationAt) {
          try { await alertsApi.schedule(editId, activationAt); } catch (err) {
            setApiError(`Los cambios se guardaron, pero la alerta no pudo programarse: ${msg(err)}`);
            return;
          }
        }
      }
      window.location.hash = '#/alertas';
    } catch (err) {
      setApiError(msg(err));
      if (err instanceof ApiError) setErrors(fieldErrors(err));
    } finally { setBusy(false); }
  };

  const scopeText = scopeIds.map((i) => labelOf(scopeItems, i)).join(' · ');
  const rolesText = listEs(roles.map((r) => labelOf(roleItems, r)));
  const badge = !alert ? 'BORRADOR' : scheduled ? 'PROGRAMADA' : alert.status === 'DRAFT' ? 'BORRADOR' : alert.status;
  const star = (on: boolean) => on && <span className="req"> *</span>;

  if (loading) return <main className="page"><p className="notice">Cargando alerta…</p></main>;
  if (forbidden) return <main className="page"><p className="notice" role="alert">No cuentas con permisos para {editId ? 'editar esta alerta' : 'crear alertas'}. <a href="#/alertas">Volver al listado</a></p></main>;
  // PUT /alertas/{id} solo acepta un scope: editar aquí borraría los demás alcances de la alerta.
  if (scopeKinds > 1) return <main className="page"><p className="notice" role="alert">Esta alerta cubre edificios y zonas a la vez y este formulario solo edita un tipo de alcance. <a href="#/alertas">Volver al listado</a></p></main>;
  if (blocked) return <main className="page"><p className="notice" role="alert">Esta alerta ya no se puede editar. <a href="#/alertas">Volver al listado</a></p></main>;

  return (
    <>
      <PageHeader badge={badge} title={editId ? 'Editar alerta' : 'Crear alerta'} subtitle="Redacte el mensaje, defina el alcance y revise los destinatarios antes de emitir." context="Configuración de alerta" />
      <main className="alert-layout">
        <form className="af" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="fgroup">
            <label className="flabel" htmlFor="title">Título{star(!editId)}</label>
            <div className={`input${errors.title ? ' bad' : ''}`}><input id="title" value={title} placeholder={editId ? 'Alerta a editar' : 'Escriba un título breve y claro para la comunidad'} onChange={(e) => setTitle(e.target.value)} /></div>
            {errors.title && <span className="error" role="alert">{errors.title}</span>}
          </div>
          <div className="fgroup">
            <label className="flabel" htmlFor="instr">Descripción{star(!editId)}</label>
            <div className={`input tall${errors.instructions ? ' bad' : ''}`}><textarea id="instr" value={instructions} placeholder="Describe la situación y su ubicación. Incluye únicamente información verificada." onChange={(e) => setInstructions(e.target.value)} /></div>
            {errors.instructions && <span className="error" role="alert">{errors.instructions}</span>}
          </div>
          <div className="two af-row">
            <div className="fgroup">
              <label className="plabel" htmlFor="start">Inicio</label>
              <DateTimeField id="start" value={start} onChange={setStart} disabled={scheduled} invalid={!!errors.start} />
              <span className="help">{scheduled ? 'La alerta ya está programada.' : 'Opcional. Si lo deja vacío, la alerta se emite de inmediato.'}</span>
              {errors.start && <span className="error" role="alert">{errors.start}</span>}
            </div>
            <div className="fgroup">
              <PickerBox label="Tipo de alerta" required={!editId} help="Elija uno o varios tipos de emergencia, u Operativa (se usa sola)." editLabel="Editar tipo" items={typeItems} selected={types} onToggle={(id) => setTypes((c) => toggleType(c, id))} error={errors.types} loading={typesLoading} />
              {typesNotice && (
                <p className="notice" role="status">
                  {typesNotice} <button type="button" className="plink" onClick={retryTypes}>Reintentar</button>
                </p>
              )}
              {typesError && (
                <p className="notice err" role="alert">
                  {typesError} <button type="button" className="plink" onClick={retryTypes}>Reintentar</button>
                </p>
              )}
            </div>
          </div>
          <div className="fgroup">
            <span className="flabel">Alcance y destinatarios{star(!editId)}</span>
            <div className="two">
              <PickerBox label="Edificios y zonas" required={!editId} help="La alerta se dirigirá a los lugares seleccionados." editLabel="Editar edificios y zonas" items={scopeItems} selected={scopeIds} onToggle={toggleScope} error={errors.scope} loading={scopeLoading} />
              <PickerBox label="Destinatarios" required={!editId} help="Grupos que recibirán el aviso en este alcance." editLabel="Editar destinatarios" items={roleItems} selected={roles} onToggle={toggleRole} error={errors.roles} loading={rolesLoading} />
            </div>
            {scopeError && (
              <p className="notice err" role="alert">
                {scopeError} <button type="button" className="plink" onClick={retryScope}>Reintentar</button>
              </p>
            )}
            {rolesNotice && (
              <p className="notice" role="status">
                {rolesNotice} <button type="button" className="plink" onClick={retryRoles}>Reintentar</button>
              </p>
            )}
            {rolesError && (
              <p className="notice err" role="alert">
                {rolesError} <button type="button" className="plink" onClick={retryRoles}>Reintentar</button>
              </p>
            )}
          </div>
        </form>
        <aside className="sidecol">
          <div className="sum2">
            <div className="sum2-head"><h2>Resumen de la alerta</h2><span className="unsent"><FilePen />Sin enviar</span></div>
            <div className="sum2-msg"><small>Título del mensaje</small><strong>{title.trim() || 'Pendiente de completar'}</strong>
              <p className="clamp">{instructions.trim() || 'Añada la descripción que recibirá la comunidad.'}</p></div>
            <div className="sep" />
            <div className="sum2-row"><small>Tipo</small><span>{listEs(types.map((t) => labelOf(typeItems, t))) || '—'}</span></div>
            <div className="sum2-row"><small>Edificios y zonas</small><span>{scopeText || '—'}</span></div>
            <div className="sum2-row"><small>Destinatarios</small><span>{rolesText || '—'}</span></div>
          </div>
          <div className="notice2"><Info /><div><b>Emitir notificará a la comunidad</b>
            <p>Se enviará un aviso a los destinatarios del alcance seleccionado{start && !scheduled ? ' una vez llegue la hora programada' : ''}. Todavía no se ha enviado ninguna notificación.</p></div></div>
          <p className="foot">Complete los campos obligatorios y revise el mensaje antes de emitir.</p>
          {apiError && <p className="notice err" role="alert">{apiError}</p>}
          <div className="actions">
            <button type="button" className="btn red" disabled={busy} onClick={submit}><Send />{busy ? 'Enviando…' : editId ? 'Guardar cambios' : 'Emitir alerta'}</button>
            <button type="button" className="btn white" onClick={() => { window.location.hash = '#/alertas'; }}>Cancelar</button>
          </div>
        </aside>
      </main>
    </>
  );
}
