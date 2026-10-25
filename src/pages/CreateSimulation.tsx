import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { MultiSelect } from '../components/MultiSelect';
import { DateTimeField } from '../components/DateTimeField';
import { api } from '../services/api';
import type { Option, SimulationDraft } from '../types';

// Valores iniciales de demostración (los del mockup)
const INITIAL: SimulationDraft = {
  name: 'Simulacro Sísmico Nacional',
  context: 'Validar evacuación prioritaria, uso de salidas seguras y concentración en el punto de encuentro designado para la Escuela Colombiana de Ingeniería.',
  start: '2026-10-12T10:05', end: '2026-10-12T10:35',
  buildings: ['Edificio A', 'Edificio B', 'Edificio F', 'Edificio C', 'Edificio G'],
  groups: ['Estudiantes', 'Profesores', 'Personal administrativo'],
  managers: ['Jerónimo M. - Brigadista', 'Alejandra N. - Brigadista', 'Valeria P. - Coordinadora', 'Daniel G. - Brigadista'],
};
type Errors = Partial<Record<keyof SimulationDraft, string>>;

function validate(d: SimulationDraft): Errors {
  const e: Errors = {}; const req = 'Campo obligatorio';
  if (!d.name.trim()) e.name = req;
  if (!d.context.trim()) e.context = req;
  if (!d.start) e.start = req;
  if (!d.end) e.end = req; else if (d.start && d.end <= d.start) e.end = 'Debe ser posterior al inicio';
  if (!d.buildings.length) e.buildings = 'Selecciona al menos un edificio o zona';
  if (!d.groups.length) e.groups = 'Selecciona al menos un grupo';
  if (!d.managers.length) e.managers = 'Selecciona al menos un responsable';
  return e;
}
const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const day = (d: Date) => `${d.getDate()} ${d.toLocaleString('es-CO', { month: 'short' }).replace('.', '')} ${d.getFullYear()}`;
function when(s: string, e: string) {
  if (!s) return '—';
  const a = new Date(s), b = e ? new Date(e) : null;
  if (!b) return `${day(a)}: ${time(a)}`;
  return a.toDateString() === b.toDateString() ? `${day(a)}: ${time(a)} - ${time(b)}` : `${day(a)} ${time(a)} - ${day(b)} ${time(b)}`;
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function CreateSimulation() {
  const [form, setForm] = useState<SimulationDraft>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState(false);
  const [cat, setCat] = useState<{ buildings: Option[]; groups: Option[]; managers: Option[] }>({ buildings: [], groups: [], managers: [] });
  useEffect(() => { api.getCatalogs().then(setCat); }, []);
  const set = <K extends keyof SimulationDraft>(k: K, v: SimulationDraft[K]) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  const save = async () => {
    const e = validate(form); setErrors(e);
    if (Object.keys(e).length) return;
    await api.saveSimulationDraft(form); setSaved(true);
  };
  const cancel = () => { setForm(INITIAL); setErrors({}); setSaved(false); };

  return (
    <>
      <PageHeader badge="BORRADOR" title="Crear simulacro" subtitle="Configura alcance, participantes y responsables antes de programar." context="Configuración de simulacro" />
      <main className="config">
        <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="field">
            <label htmlFor="name">Nombre del simulacro <span style={{ color: 'var(--red)' }}>*</span></label>
            <div className={`input${errors.name ? ' bad' : ''}`}><input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            {errors.name && <span className="error" role="alert">{errors.name}</span>}
          </div>
          <div className="field">
            <label htmlFor="context">Objetivo y contexto <span style={{ color: 'var(--red)' }}>*</span></label>
            <div className={`input area${errors.context ? ' bad' : ''}`}><textarea id="context" rows={3} value={form.context} onChange={(e) => set('context', e.target.value)} /></div>
            {errors.context && <span className="error" role="alert">{errors.context}</span>}
          </div>
          <div className="two">
            {([['start', 'Inicio'], ['end', 'Finalización']] as const).map(([k, l]) => (
              <div className="field" key={k}>
                <label htmlFor={k}>{l} <span style={{ color: 'var(--red)' }}>*</span></label>
                <DateTimeField id={k} value={form[k]} onChange={(v) => set(k, v)} invalid={!!errors[k]} />
                {errors[k] && <span className="error" role="alert">{errors[k]}</span>}
              </div>
            ))}
          </div>
          <div className="two">
            <MultiSelect label="Edificios y zonas activos" help="Selecciona edificios y zonas activas del campus" options={cat.buildings} value={form.buildings} onChange={(v) => set('buildings', v)} error={errors.buildings} />
            <MultiSelect label="Participantes" help="Selecciona grupos de participantes" options={cat.groups} value={form.groups} onChange={(v) => set('groups', v)} error={errors.groups} />
          </div>
          <MultiSelect label="Responsables" help="Selecciona responsables con rol brigadista o coordinador de emergencia" options={cat.managers} value={form.managers} onChange={(v) => set('managers', v)} error={errors.managers} />
        </form>
        <aside className="side">
          <div className="summary">
            <h2>Resumen de configuración</h2>
            <div className="sm"><small>Nombre</small><span className="big">{form.name || '—'}</span></div>
            <div className="sm"><small>Fechas</small><span className="mid">{when(form.start, form.end)}</span></div>
            <div className="sep" />
            <div className="row"><small>Alcance</small><b>{plural(form.buildings.length, 'edificio', 'edificios')}</b></div>
            <div className="row"><small>Participantes</small><b>{plural(form.groups.length, 'grupo', 'grupos')}</b></div>
            <div className="row"><small>Responsables</small><b>{plural(form.managers.length, 'responsable', 'responsables')}</b></div>
          </div>
          {saved && <p className="notice" role="status">Borrador guardado localmente.</p>}
          <div className="actions">
            <button type="button" className="btn red" onClick={save}>Guardar borrador</button>
            <button type="button" className="btn white" onClick={cancel}>Cancelar</button>
          </div>
        </aside>
      </main>
    </>
  );
}
