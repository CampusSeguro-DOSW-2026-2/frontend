import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { PickerBox } from '../components/PickerBox';
import { DateTimeField } from '../components/DateTimeField';
import { FilePen, Info, Send } from '../components/Icons';
import { alertsApi, type Alert, type AlertInput } from '../services/alerts';
import { ApiError } from '../services/http';
import { ROLE_ITEMS, SCOPE_ITEMS, labelOf, listEs, scopeIdsOf } from '../services/catalog';

const typeOf = (id: string) => (id === 'CAMPUS' ? 'CAMPUS' : id.startsWith('BLD') ? 'BUILDING' : 'ZONE');
const toLocalInput = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const msg = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : 'Error inesperado.');

// Errores de MS03 junto a cada campo (details.field viene con nombres del contrato en inglés).
const FIELD: Record<string, [string, string]> = {
  title: ['title', 'Revisa el título (obligatorio, máximo 150 caracteres).'],
  instructions: ['instructions', 'Revisa la descripción (obligatoria, máximo 1000 caracteres).'],
  scope: ['scope', 'Revisa los edificios y zonas seleccionados.'],
  recipients: ['roles', 'Revisa los destinatarios seleccionados.'],
  activationAt: ['start', 'Debe ser una fecha futura'],
};
const fieldErrors = (e: ApiError) => {
  const out: Record<string, string> = {};
  if (e.code === 'INVALID_ACTIVATION_DATE') out.start = FIELD.activationAt[1];
  for (const d of e.details) {
    const f = FIELD[d.field.split(/[.[]/)[0]];
    if (f) out[f[0]] = f[1];
  }
  return out;
};

export default function AlertForm({ editId }: { editId?: string }) {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [start, setStart] = useState('');
  const [scopeIds, setScopeIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    if (!editId) return;
    alertsApi.get(editId).then((a) => {
      setAlert(a); setTitle(a.title); setInstructions(a.instructions); setScopeIds(scopeIdsOf(a.scope));
      setRoles(a.recipients.filter((r) => r.type === 'ROLE').map((r) => r.id));
      if (a.activationAt) setStart(toLocalInput(a.activationAt));
    }).catch((e) => setApiError(msg(e))).finally(() => setLoading(false));
  }, [editId]);

  const status = alert?.status;
  const scheduled = status === 'SCHEDULED';
  const blocked = !!alert && status !== 'DRAFT' && !scheduled;

  const toggleScope = (id: string) => setScopeIds((cur) => {
    if (cur.includes(id)) return cur.filter((x) => x !== id);
    const same = cur.length > 0 && typeOf(cur[0]) === typeOf(id) && typeOf(id) !== 'CAMPUS';
    return same ? [...cur, id] : [id]; // una alerta admite un solo tipo de alcance
  });
  const toggleRole = (id: string) => setRoles((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const validate = () => {
    const e: Record<string, string> = {}; const req = 'Campo obligatorio';
    if (!title.trim()) e.title = req; else if (title.length > 150) e.title = 'Máximo 150 caracteres';
    if (!instructions.trim()) e.instructions = req; else if (instructions.length > 1000) e.instructions = 'Máximo 1000 caracteres';
    if (!scopeIds.length) e.scope = 'Selecciona al menos un lugar';
    if (!roles.length) e.roles = 'Selecciona al menos un grupo';
    if (start && !scheduled && new Date(start).getTime() <= Date.now()) e.start = 'Debe ser una fecha futura';
    return e;
  };

  const submit = async () => {
    const e = validate(); setErrors(e); setApiError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    const t = typeOf(scopeIds[0]);
    const payload: AlertInput = {
      type: 'OTHER', title: title.trim(), instructions: instructions.trim(),
      scope: t === 'CAMPUS' ? { type: 'CAMPUS' } : { type: t, ids: scopeIds },
      recipients: roles.map((id) => ({ type: 'ROLE' as const, id })),
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

  const scopeText = scopeIds.map((i) => labelOf(SCOPE_ITEMS, i)).join(' · ');
  const rolesText = listEs(roles.map((r) => labelOf(ROLE_ITEMS, r)));
  const badge = !alert ? 'BORRADOR' : scheduled ? 'PROGRAMADA' : alert.status === 'DRAFT' ? 'BORRADOR' : alert.status;
  const star = (on: boolean) => on && <span className="req"> *</span>;

  if (loading) return <main className="page"><p className="notice">Cargando alerta…</p></main>;
  if (blocked) return <main className="page"><p className="notice" role="alert">Esta alerta ya no se puede editar. <a href="#/alertas">Volver al listado</a></p></main>;

  return (
    <>
      <PageHeader badge={badge} title={editId ? 'Editar alerta' : 'Crear alerta'} subtitle="Redacta el mensaje, define el alcance y revisa los destinatarios antes de emitir." context="Configuración de alerta" />
      <main className="alert-layout">
        <form className="af" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="fgroup">
            <label className="flabel" htmlFor="title">Título{star(!editId)}</label>
            <div className={`input${errors.title ? ' bad' : ''}`}><input id="title" value={title} placeholder={editId ? 'Alerta a editar' : 'Escribe un título breve y claro para la comunidad'} onChange={(e) => setTitle(e.target.value)} /></div>
            {errors.title && <span className="error" role="alert">{errors.title}</span>}
          </div>
          <div className="fgroup">
            <label className="flabel" htmlFor="instr">Descripción{star(!editId)}</label>
            <div className={`input tall${errors.instructions ? ' bad' : ''}`}><textarea id="instr" value={instructions} placeholder="Describe la situación y su ubicación. Incluye únicamente información verificada." onChange={(e) => setInstructions(e.target.value)} /></div>
            {errors.instructions && <span className="error" role="alert">{errors.instructions}</span>}
          </div>
          <div className="fgroup half">
            <label className="plabel" htmlFor="start">Inicio</label>
            <DateTimeField id="start" value={start} onChange={setStart} disabled={scheduled} invalid={!!errors.start} />
            <span className="help">{scheduled ? 'La alerta ya está programada.' : 'Opcional. Si lo dejas vacío, la alerta se emite de inmediato.'}</span>
            {errors.start && <span className="error" role="alert">{errors.start}</span>}
          </div>
          <div className="fgroup">
            <span className="flabel">Alcance y destinatarios{star(!editId)}</span>
            <div className="two">
              <PickerBox label="Edificios y zonas" required={!editId} help="La alerta se dirigirá a los lugares seleccionados." editLabel="Editar edificios y zonas" items={SCOPE_ITEMS} selected={scopeIds} onToggle={toggleScope} error={errors.scope} />
              <PickerBox label="Destinatarios" required={!editId} help="Grupos que recibirán el aviso en este alcance." editLabel="Editar destinatarios" items={ROLE_ITEMS} selected={roles} onToggle={toggleRole} error={errors.roles} />
            </div>
          </div>
        </form>
        <aside className="sidecol">
          <div className="sum2">
            <div className="sum2-head"><h2>Resumen de la alerta</h2><span className="unsent"><FilePen />Sin enviar</span></div>
            <div className="sum2-msg"><small>Título del mensaje</small><strong>{title.trim() || 'Pendiente de completar'}</strong>
              <p className="clamp">{instructions.trim() || 'Añada la descripción que recibirá la comunidad.'}</p></div>
            <div className="sep" />
            <div className="sum2-row"><small>Edificios y zonas</small><span>{scopeText || '—'}</span></div>
            <div className="sum2-row"><small>Destinatarios</small><span>{rolesText || '—'}</span></div>
          </div>
          <div className="notice2"><Info /><div><b>Emitir notificará a la comunidad</b>
            <p>Se enviará un aviso a los destinatarios del alcance seleccionado{start && !scheduled ? ' una vez llegue la hora programada' : ''}. Todavía no se ha enviado ninguna notificación.</p></div></div>
          <p className="foot">Completa los campos obligatorios y revisa el mensaje antes de emitir.</p>
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
