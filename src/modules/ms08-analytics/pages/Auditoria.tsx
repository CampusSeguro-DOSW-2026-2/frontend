import { etiquetaCodigo, textoLegible } from '../../../shared/utils/etiquetas';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PERMISSION } from '../../../shared/permissions';
import { ApiError } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { isTechnicalId, withoutIds } from '../../../shared/utils/text';
import { PERMISSION as MS01_PERMISSION } from '../../ms01-identity/utils/permissions';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { eventsApi } from '../../ms06-drills/services/events';
import ErrorNotice from '../components/ErrorNotice';
import FiltroBusqueda, { type Opcion } from '../components/FiltroBusqueda';
import { useEventNames } from '../hooks/useEventNames';
import { useUserNames } from '../hooks/useUserNames';
import { analyticsApi } from '../services/analytics';

/** Registros por página: pocos, porque en celular cada registro es una tarjeta con siete datos. */
const REGISTROS_POR_PAGINA = 10;
import { peopleApi } from '../services/people';
import type { AuditFilters, AuditRecord, EventKind, Page } from '../types';
import {
  ACTIONS, KIND_LABEL, MODULES, RESULT_LABEL, actionLabel, formatBogota, moduleLabel, splitResource, todayInBogota,
} from '../utils/format';
import '../../ms06-drills/styles/events.css';
import '../styles/analytics.css';

const EMPTY: AuditFilters = { desde: '', hasta: '', modulo: '', accion: '', usuarioId: '', eventoId: '', tipoEvento: '' };
type FilterErrors = Partial<Record<keyof AuditFilters, string>>;

/** Persona sin nombre disponible (sin ms01:user:read o MS01 no respondió): nunca se muestra su id. */
const UNKNOWN_USER = 'Usuario del sistema';
const NO_USER = 'Proceso automático';
const UNKNOWN_EVENT = 'Evento sin nombre disponible';

function validate(f: AuditFilters): FilterErrors {
  const errors: FilterErrors = {};
  if (f.desde && f.hasta && f.desde > f.hasta) errors.hasta = 'La fecha final debe ser igual o posterior a la inicial.';
  return errors;
}

const isFiltered = (f: AuditFilters) => Object.values(f).some((v) => v.trim() !== '');

/**
 * Auditoría de MS08: tabla de solo lectura con filtros y paginación del servidor. No hay acciones de editar ni
 * borrar porque la colección es append-only. Lo que cada usuario ve (eventos reales, simulacros o todo) lo
 * decide MS08 según sus permisos; la pantalla muestra lo que llega.
 *
 * Los filtros se aplican al instante. Persona y Evento se buscan por nombre mientras se escribe (basta una parte, sin
 * tildes ni mayúsculas): las personas salen de MS01 (nombre o correo) y los eventos de MS06 (título), y a MS08 viajan
 * los ids de todas las coincidencias. La tabla muestra nombres; los ids solo viajan por debajo.
 */
export default function Auditoria({ session }: { session: Session }) {
  const canReadUsers = hasPermission(session, MS01_PERMISSION.USER_READ);
  const canReadEvents = hasPermission(session, PERMISSION.MS06_DRILL_READ, PERMISSION.MS06_REAL_EVENT_READ,
    PERMISSION.MS06_DRILL_MANAGE, PERMISSION.MS06_REAL_EVENT_MANAGE);
  const [draft, setDraft] = useState<AuditFilters>(EMPTY);
  const [personaTexto, setPersonaTexto] = useState('');
  const [eventoTexto, setEventoTexto] = useState('');
  // Coincidencias de la búsqueda por nombre: null sin texto; lista (posiblemente vacía) con texto
  const [personas, setPersonas] = useState<Opcion[] | null>(null);
  const [eventos, setEventos] = useState<Opcion[] | null>(null);
  // Elegida en la lista desplegable: el filtro queda solo con ella
  const [personaElegida, setPersonaElegida] = useState<Opcion | null>(null);
  const [eventoElegido, setEventoElegido] = useState<Opcion | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FilterErrors>({});
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<AuditRecord> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const { catalog } = useScopeCatalog();

  // Persona: busca mientras se escribe (con una pausa de 300 ms para no consultar en cada tecla)
  useEffect(() => {
    const q = personaTexto.trim();
    if (!q || personaElegida) { if (!q) setPersonas(null); return undefined; }
    let ignore = false;
    setBuscando(true);
    const t = window.setTimeout(() => {
      peopleApi.coinciden(session, q)
        .then((l) => { if (!ignore) setPersonas(l.slice(0, 100).map((p) => ({ id: p.id, label: p.name, detail: p.email }))); })
        .catch(() => { if (!ignore) setPersonas([]); })
        .finally(() => { if (!ignore) setBuscando(false); });
    }, 300);
    return () => { ignore = true; window.clearTimeout(t); };
  }, [personaTexto, personaElegida, session]);

  // Evento: MS06 busca por título (contiene, sin distinguir mayúsculas)
  useEffect(() => {
    const q = eventoTexto.trim();
    if (!q || eventoElegido) { if (!q) setEventos(null); return undefined; }
    let ignore = false;
    setBuscando(true);
    const t = window.setTimeout(() => {
      eventsApi.search(session, { title: q, size: 100 })
        .then((p) => { if (!ignore) setEventos(p.content.map((e) => ({ id: e.id, label: e.name, detail: e.simulacro ? 'Simulacro' : 'Evento real' }))); })
        .catch(() => { if (!ignore) setEventos([]); })
        .finally(() => { if (!ignore) setBuscando(false); });
    }, 300);
    return () => { ignore = true; window.clearTimeout(t); };
  }, [eventoTexto, eventoElegido, session]);

  const errores = validate(draft);
  const applied = useMemo<AuditFilters>(() => ({
    ...draft,
    usuarioId: personaElegida ? personaElegida.id : personas?.map((o) => o.id).join(',') ?? '',
    eventoId: eventoElegido ? eventoElegido.id : eventos?.map((o) => o.id).join(',') ?? '',
  }), [draft, personas, eventos, personaElegida, eventoElegido]);
  // Un texto sin coincidencias no tiene registros: no se consulta a MS08
  const sinCoincidencias = (!personaElegida && personas !== null && personas.length === 0)
    || (!eventoElegido && eventos !== null && eventos.length === 0);
  const appliedKey = JSON.stringify(applied);

  const load = useCallback(async () => {
    if (Object.keys(validate(applied)).length > 0) return;
    if (sinCoincidencias) { setData({ content: [], page: 0, size: REGISTROS_POR_PAGINA, totalElements: 0, totalPages: 0 }); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsApi.audit(session, applied, page, REGISTROS_POR_PAGINA));
    } catch (err) {
      setError(err);
      // MS08 marca el filtro que rechazó (400 VALIDACION): se muestra junto al campo
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setFieldErrors(err.fields as FilterErrors);
    } finally {
      setLoading(false);
    }
  // appliedKey resume `applied`
  }, [session, appliedKey, page, sinCoincidencias]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  // Cada cambio de filtros vuelve a la primera página
  useEffect(() => { setPage(0); }, [appliedKey]);

  const set = (key: keyof AuditFilters, value: string) => {
    setDraft((d) => ({ ...d, [key]: value, ...(key === 'modulo' ? { accion: '' } : {}) }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const clear = () => {
    setDraft(EMPTY);
    setPersonaTexto('');
    setEventoTexto('');
    setPersonaElegida(null);
    setEventoElegido(null);
    setFieldErrors({});
    setPage(0);
  };

  const today = todayInBogota();
  const items = useMemo(() => data?.content ?? [], [data]);

  // Ids de la página visible que se muestran por nombre: personas (quien actuó y usuario afectado) y eventos
  const resourceIds = (clave: string) => items.map((r) => (r.recursoAfectado ? splitResource(r.recursoAfectado) : null))
    .filter((x): x is ReturnType<typeof splitResource> => x !== null && x.clave === clave && !!x.valor)
    .map((x) => x.valor);
  const userIds = [...items.map((r) => r.usuarioId).filter((v): v is string => !!v), ...resourceIds('usuario')];
  const eventIds = [...new Set([...items.map((r) => r.eventoId).filter((v): v is string => !!v), ...resourceIds('evento')])];
  const userNames = useUserNames(session, userIds, canReadUsers);
  const eventNames = useEventNames(session, canReadEvents ? eventIds : []);

  const userText = (id: string | null) => (id ? userNames[id] ?? UNKNOWN_USER : NO_USER);
  const resourceText = (recurso: string | null) => {
    if (!recurso) return '—';
    const { tipo, clave, valor } = splitResource(recurso);
    if (!isTechnicalId(valor)) return tipo ? `${tipo} ${valor}` : withoutIds(valor) || '—';
    let name: string | undefined;
    if (clave === 'usuario') name = userNames[valor];
    if (clave === 'evento') name = eventNames[valor];
    if (clave === 'edificio' || clave === 'zona_segura') {
      name = catalog ? [...catalog.buildings, ...catalog.zones].find((i) => i.id === valor)?.label : undefined;
    }
    return name ? `${tipo} ${name}` : tipo || '—';
  };

  // Acciones del catálogo más las que ya llegaron en los registros (un MS puede emitir acciones nuevas)
  const [seen, setSeen] = useState<{ modulo: string; codigo: string }[]>([]);
  useEffect(() => {
    setSeen((cur) => {
      const add = items.filter((r) => ![...ACTIONS, ...cur].some((a) => a.modulo === r.modulo && a.codigo === r.accion))
        .map((r) => ({ modulo: r.modulo, codigo: r.accion }));
      return add.length ? [...cur, ...add.filter((a, i) => add.findIndex((b) => b.modulo === a.modulo && b.codigo === a.codigo) === i)] : cur;
    });
  }, [items]);
  const actionOptions = [...ACTIONS, ...seen.map((a) => ({ ...a, label: actionLabel(a.modulo, a.codigo) }))]
    .filter((a) => !draft.modulo || a.modulo === draft.modulo)
    .sort((a, b) => a.modulo.localeCompare(b.modulo) || a.label.localeCompare(b.label, 'es'));

  const dateInput = (key: 'desde' | 'hasta', label: string, props: Record<string, string>) => (
    <div className="field">
      <label htmlFor={`aud-${key}`}>{label}</label>
      <input id={`aud-${key}`} type="date" value={draft[key]} onChange={(e) => set(key, e.target.value)}
        aria-invalid={fieldErrors[key] ? true : undefined} aria-describedby={fieldErrors[key] ? `aud-${key}-err` : undefined} {...props} />
      {(fieldErrors[key] ?? errores[key]) && <span id={`aud-${key}-err`} className="err-text">{fieldErrors[key] ?? errores[key]}</span>}
    </div>
  );

  const anyFilter = isFiltered(draft) || !!personaTexto.trim() || !!eventoTexto.trim();
  const resumen = (elegida: Opcion | null, r: Opcion[] | null, cosa: [string, string]) => {
    if (elegida) return `Filtrando por ${elegida.label}.`;
    if (!r) return '';
    if (r.length === 0) return `Ningun${cosa[0] === 'persona' ? 'a' : ''} ${cosa[0]} coincide.`;
    return r.length === 1 ? `Filtrando por ${r[0].label}.` : `Filtrando por las ${r.length} ${cosa[1]} que coinciden.`;
  };

  return (
    <>
      <header className="ev-head">
        <div>
          <h1>Auditoría</h1>
          <p>Registro de las acciones realizadas en CampusSeguro. Es de solo lectura: los registros no se editan ni se borran.</p>
        </div>
      </header>
      <main className="ev-main">
        <form className="an-filters" aria-label="Filtros de auditoría" onSubmit={(e) => e.preventDefault()} noValidate>
          {dateInput('desde', 'Desde', { max: draft.hasta || today })}
          {dateInput('hasta', 'Hasta', { min: draft.desde, max: today })}
          <div className="field">
            <label htmlFor="aud-modulo">Microservicio de origen</label>
            <select id="aud-modulo" value={draft.modulo} onChange={(e) => set('modulo', e.target.value)}>
              <option value="">Todos</option>
              {MODULES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="aud-accion">Acción</label>
            <select id="aud-accion" value={draft.accion} onChange={(e) => set('accion', e.target.value)}>
              <option value="">Todas</option>
              {actionOptions.map((a) => (
                <option key={`${a.modulo}-${a.codigo}`} value={a.codigo}>{draft.modulo ? a.label : `${a.label} (${moduleLabel(a.modulo)})`}</option>
              ))}
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
          {canReadEvents && (
            <FiltroBusqueda label="Evento" placeholder="Escriba parte del nombre del evento" texto={eventoTexto} onTexto={setEventoTexto}
              opciones={eventos} elegida={eventoElegido} onElegir={setEventoElegido} ayuda={resumen(eventoElegido, eventos, ['evento', 'eventos'])} />
          )}
          {canReadUsers && (
            <FiltroBusqueda label="Persona" placeholder="Escriba parte del nombre o del correo" texto={personaTexto} onTexto={setPersonaTexto}
              opciones={personas} elegida={personaElegida} onElegir={setPersonaElegida} ayuda={resumen(personaElegida, personas, ['persona', 'personas'])} />
          )}
          {anyFilter && (
            <div className="an-actions">
              <button type="button" className="btn white" onClick={clear}>Limpiar filtros</button>
            </div>
          )}
        </form>
        <p className="help">Las fechas y horas se muestran en hora de Bogotá.</p>

        {error !== null && <ErrorNotice error={error} onRetry={load} />}
        {(loading || buscando) && <p className="notice" role="status">{buscando ? 'Buscando…' : 'Cargando registros de auditoría…'}</p>}

        {!loading && error === null && data && items.length === 0 && (
          <div className="ev-empty">{anyFilter ? 'No hay registros que coincidan con los filtros.' : 'Todavía no hay registros de auditoría.'}</div>
        )}

        {items.length > 0 && (
          <table className="ev-table an-table" aria-busy={loading}>
            <thead>
              <tr><th>Fecha y hora</th><th>Origen</th><th>Acción</th><th>Resultado</th><th>Persona</th><th>Recurso</th><th>Detalle</th></tr>
            </thead>
            <tbody>
              {items.map((r, i) => (
                <tr key={r.id || `${r.fechaHora}-${i}`}>
                  <td>{formatBogota(r.fechaHora)}</td>
                  <td>{moduleLabel(r.modulo)}</td>
                  <td>
                    <div className="t">{actionLabel(r.modulo, r.accion)}</div>
                    <div className="s">{r.tipoEvento ? KIND_LABEL[r.tipoEvento] : 'Administrativo'}</div>
                    {r.eventoId && <div className="s">{eventNames[r.eventoId] ?? UNKNOWN_EVENT}</div>}
                  </td>
                  <td><span className={`st ${r.resultado}`}>{RESULT_LABEL[r.resultado] ?? etiquetaCodigo(r.resultado)}</span></td>
                  <td>{userText(r.usuarioId)}</td>
                  <td>{resourceText(r.recursoAfectado)}</td>
                  <td>{r.detalle ? textoLegible(withoutIds(r.detalle)) || '—' : '—'}</td>
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
