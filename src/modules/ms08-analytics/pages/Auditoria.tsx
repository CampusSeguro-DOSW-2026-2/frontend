import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import ErrorNotice from '../components/ErrorNotice';
import { analyticsApi, PAGE_SIZE } from '../services/analytics';
import type { AuditFilters, AuditRecord, EventKind, Page } from '../types';
import { KIND_LABEL, MODULES, RESULT_LABEL, formatBogota, isUuid, todayInBogota } from '../utils/format';
import '../../ms06-drills/styles/events.css';
import '../styles/analytics.css';

const EMPTY: AuditFilters = { desde: '', hasta: '', modulo: '', accion: '', usuarioId: '', eventoId: '', tipoEvento: '', correlationId: '' };
type FilterErrors = Partial<Record<keyof AuditFilters, string>>;

function validate(f: AuditFilters): FilterErrors {
  const errors: FilterErrors = {};
  if (f.desde && f.hasta && f.desde > f.hasta) errors.hasta = 'Debe ser igual o posterior a la fecha inicial.';
  if (f.usuarioId.trim() && !isUuid(f.usuarioId)) errors.usuarioId = 'Escriba un id válido (UUID).';
  if (f.eventoId.trim() && !isUuid(f.eventoId)) errors.eventoId = 'Escriba un id válido (UUID).';
  if (f.correlationId.trim() && !isUuid(f.correlationId)) errors.correlationId = 'Escriba un id válido (UUID).';
  if (f.accion.trim() && !/^[A-Za-z_]+$/.test(f.accion.trim())) errors.accion = 'Solo letras y guion bajo, p. ej. INICIO_SESION.';
  return errors;
}

const isFiltered = (f: AuditFilters) => Object.values(f).some((v) => v.trim() !== '');

/**
 * Auditoría de MS08: tabla de solo lectura con filtros y paginación del servidor. No hay acciones de editar ni
 * borrar porque la colección es append-only. Lo que cada usuario ve (eventos reales, simulacros o todo) lo
 * decide MS08 según sus permisos; la pantalla muestra lo que llega.
 */
export default function Auditoria({ session }: { session: Session }) {
  const [draft, setDraft] = useState<AuditFilters>(EMPTY);
  const [applied, setApplied] = useState<AuditFilters>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FilterErrors>({});
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AuditRecord> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsApi.audit(session, applied, page, PAGE_SIZE));
    } catch (err) {
      setError(err);
      // MS08 marca el filtro que rechazó (400 VALIDACION): se muestra junto al campo
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setFieldErrors(err.fields as FilterErrors);
    } finally {
      setLoading(false);
    }
  }, [session, applied, page]);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof AuditFilters, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const errors = validate(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setApplied(draft);
    setPage(0);
  };

  const clear = () => {
    setDraft(EMPTY);
    setFieldErrors({});
    setApplied(EMPTY);
    setPage(0);
  };

  const today = todayInBogota();
  const items = data?.content ?? [];
  const input = (key: keyof AuditFilters, label: string, props: Record<string, string> = {}) => (
    <div className="field">
      <label htmlFor={`aud-${key}`}>{label}</label>
      <input id={`aud-${key}`} value={draft[key]} onChange={(e) => set(key, e.target.value)}
        aria-invalid={fieldErrors[key] ? true : undefined} aria-describedby={fieldErrors[key] ? `aud-${key}-err` : undefined} {...props} />
      {fieldErrors[key] && <span id={`aud-${key}-err`} className="err-text">{fieldErrors[key]}</span>}
    </div>
  );

  return (
    <>
      <header className="ev-head">
        <div>
          <h1>Auditoría</h1>
          <p>Registro de las acciones realizadas en CampusSeguro. Es de solo lectura: los registros no se editan ni se borran.</p>
        </div>
      </header>
      <main className="ev-main">
        <form className="an-filters" aria-label="Filtros de auditoría" onSubmit={apply} noValidate>
          {input('desde', 'Desde', { type: 'date', max: draft.hasta || today })}
          {input('hasta', 'Hasta', { type: 'date', min: draft.desde, max: today })}
          <div className="field">
            <label htmlFor="aud-modulo">Microservicio de origen</label>
            <select id="aud-modulo" value={draft.modulo} onChange={(e) => set('modulo', e.target.value)}>
              <option value="">Todos</option>
              {MODULES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="aud-tipoEvento">Tipo de evento</label>
            <select id="aud-tipoEvento" value={draft.tipoEvento} onChange={(e) => set('tipoEvento', e.target.value as EventKind | '')}>
              <option value="">Todos los que puede ver</option>
              <option value="SIMULACRO">Simulacros</option>
              <option value="REAL">Eventos reales</option>
            </select>
          </div>
          {input('accion', 'Tipo de acción', { placeholder: 'p. ej. INICIO_SESION', autoComplete: 'off' })}
          {input('usuarioId', 'Usuario (id)', { placeholder: 'UUID del usuario', autoComplete: 'off', spellCheck: 'false' })}
          {input('eventoId', 'Evento (id)', { placeholder: 'UUID del evento', autoComplete: 'off', spellCheck: 'false' })}
          {input('correlationId', 'Correlation ID', { placeholder: 'UUID de la petición', autoComplete: 'off', spellCheck: 'false' })}
          <div className="an-actions">
            {(isFiltered(draft) || isFiltered(applied)) && <button type="button" className="btn white" onClick={clear}>Limpiar filtros</button>}
            <button type="submit" className="btn deep">Aplicar filtros</button>
          </div>
        </form>
        <p className="help">Las fechas y horas se muestran en hora de Bogotá.</p>

        {error !== null && <ErrorNotice error={error} onRetry={load} />}
        {loading && <p className="notice" role="status">Cargando registros de auditoría…</p>}

        {!loading && error === null && data && items.length === 0 && (
          <div className="ev-empty">{isFiltered(applied) ? 'No hay registros que coincidan con los filtros.' : 'Todavía no hay registros de auditoría.'}</div>
        )}

        {items.length > 0 && (
          <table className="ev-table an-table" aria-busy={loading}>
            <thead>
              <tr><th>Fecha y hora</th><th>Origen</th><th>Acción</th><th>Resultado</th><th>Usuario</th><th>Recurso</th><th>Detalle</th><th>Correlation ID</th></tr>
            </thead>
            <tbody>
              {items.map((r, i) => (
                <tr key={r.id || `${r.correlationId}-${i}`}>
                  <td>{formatBogota(r.fechaHora)}</td>
                  <td>{r.modulo}</td>
                  <td>
                    <div className="t">{r.accion}</div>
                    <div className="s">{r.tipoEvento ? KIND_LABEL[r.tipoEvento] : 'Administrativo'}</div>
                    {r.eventoId && <div className="s an-mono">Evento {r.eventoId}</div>}
                  </td>
                  <td><span className={`st ${r.resultado}`}>{RESULT_LABEL[r.resultado] ?? r.resultado}</span></td>
                  <td className="an-mono">{r.usuarioId ?? 'Anónimo'}</td>
                  <td className="an-mono">{r.recursoAfectado ?? '—'}</td>
                  <td>{r.detalle ?? '—'}</td>
                  <td className="an-mono">{r.correlationId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && data.totalPages > 1 && (
          <div className="ev-pager">
            <span>Página {data.page + 1} de {data.totalPages} · {data.totalElements} registros</span>
            <div>
              <button type="button" className="ev-tab" disabled={loading || page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</button>
              <button type="button" className="ev-tab" disabled={loading || page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
            </div>
          </div>
        )}
        {data && data.totalPages <= 1 && items.length > 0 && <p className="help">{data.totalElements} registros</p>}
      </main>
    </>
  );
}
