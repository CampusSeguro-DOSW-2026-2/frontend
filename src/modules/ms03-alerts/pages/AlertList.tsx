import { useEffect, useRef, useState } from 'react';
import { Edit, EmptyLogo, Plus, Search } from '../../../shared/components/Icons';
import { errorMessage } from '../../../shared/services/http';
import { getSession, sessionPermissions } from '../../../shared/services/session';
import { alertAccess } from '../permissions';
import { alertsApi, type AlertSummary } from '../services/alerts';
import { recipientsText, scopeText } from '../services/catalog';
import { useAlertFilters } from '../hooks/useAlertFilters';
import { useScopeCatalog } from '../hooks/useScopeCatalog';
import AlertFilterBar from '../components/AlertFilterBar';

// Colores de presentación de los estados conocidos. Un estado nuevo o histórico conserva su etiqueta del catálogo
// pero se pinta con el color neutro; el catálogo de MS03 manda las etiquetas y `finalState`.
const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#0F172A', SCHEDULED: '#2563EB', ACTIVE: '#990000', ARCHIVED: '#5A5C60',
};
const FALLBACK_COLOR = '#5A5C60';

const errMsg = errorMessage;
const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100; // límite de MS03
const REFRESH_MS = 15000;

const EMPTY_ALL = 'El campus está seguro. No hay alertas';
const EMPTY_FILTERED = 'No hay alertas que coincidan con el filtro';

const fetchPage = async (filters: Record<string, string[]>, page: number, size = PAGE_SIZE) => {
  const p = await alertsApi.list({ filters, page, size });
  return { items: p.content, page: p.page, totalPages: p.totalPages, totalElements: p.totalElements };
};

const hasSelection = (selected: Record<string, string[]>) =>
  Object.values(selected).some((values) => values.length > 0);

export default function AlertList() {
  const access = alertAccess(sessionPermissions(getSession()));
  // Nombres de edificios y zonas desde MS02; si no llega, el alcance se muestra con su id.
  const { catalog } = useScopeCatalog();
  // Grupos y opciones desde MS03; si falla, el listado sigue cargando sin filtros y la barra ofrece reintentar.
  const { groups, loading: filtersLoading, error: filtersError, retry: retryFilters } = useAlertFilters();
  const [items, setItems] = useState<AlertSummary[]>([]);
  const [pg, setPg] = useState({ page: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const [reloads, setReloads] = useState(0);

  // Primera página: la selección de filtros solo cambia al tocar un botón, así el efecto no se repite en cada render.
  useEffect(() => {
    let ignore = false;
    fetchPage(selected, 0)
      .then((r) => { if (!ignore) { setItems(r.items); setPg({ page: r.page, totalPages: r.totalPages }); } })
      .catch((e: unknown) => { if (!ignore) setError(errMsg(e)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [selected, reloads]);
  const reload = () => { setLoading(true); setError(''); setReloads((n) => n + 1); };

  // Refresco en segundo plano: los cambios del scheduler o de MS06 aparecen sin recargar la página.
  // Vuelve a pedir todas las páginas ya cargadas en una sola consulta para no perder "Cargar más".
  const loadedPages = useRef(1);
  const busy = useRef(false);
  useEffect(() => { loadedPages.current = pg.page + 1; busy.current = loading; }, [pg.page, loading]);
  useEffect(() => {
    let ignore = false;
    const refresh = () => {
      if (busy.current || document.visibilityState !== 'visible') return;
      const pages = Math.min(loadedPages.current, MAX_PAGE_SIZE / PAGE_SIZE);
      fetchPage(selected, 0, pages * PAGE_SIZE)
        .then((r) => {
          if (ignore) return;
          setError(''); // si MS03 aún arrancaba en la carga inicial, la vista se recupera sola
          setItems(r.items);
          setPg({ page: pages - 1, totalPages: Math.ceil(r.totalElements / PAGE_SIZE) });
        })
        .catch(() => { /* un fallo del refresco no interrumpe la vista; el siguiente intento lo reintenta */ });
    };
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => { ignore = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [selected]);

  // Cada cambio de filtros vuelve a la primera página; "Cargar más" y el refresco comparten esta misma selección.
  const applySelection = (next: Record<string, string[]>) => {
    setLoading(true); setError(''); setItems([]); setSelected(next);
  };
  const toggleFilter = (groupKey: string, value: string) => {
    const current = selected[groupKey] ?? [];
    const group = groups.find((g) => g.key === groupKey);
    if (group?.multiple) {
      applySelection({ ...selected, [groupKey]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
      return;
    }
    // Selección única: el valor reemplaza al anterior y "Todos" lo limpia.
    if (current.length === 1 && current[0] === value) return;
    applySelection({ ...selected, [groupKey]: [value] });
  };
  const clearFilter = (groupKey: string) => {
    if (!(selected[groupKey] ?? []).length) return;
    applySelection({ ...selected, [groupKey]: [] });
  };

  const loadMore = async () => {
    setLoading(true);
    try {
      const r = await fetchPage(selected, pg.page + 1);
      setItems((cur) => [...cur, ...r.items]); setPg({ page: r.page, totalPages: r.totalPages });
    } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  };

  const act = async (fn: () => Promise<unknown>, ask: string) => {
    if (!window.confirm(ask)) return;
    try { await fn(); reload(); } catch (e) { setError(errMsg(e)); }
  };

  // El badge usa la etiqueta y `finalState` del catálogo de MS03. Sin catálogo (MS03 no respondió) o con un código
  // que no está en él, se muestra el código con el color neutro.
  const statusGroup = groups.find((g) => g.key === 'status');
  const statusMeta = (code: string) => {
    if (!statusGroup) return { label: code, color: FALLBACK_COLOR, off: false };
    const option = statusGroup.options.find((o) => o.value === code);
    return { label: option?.label ?? code, color: STATUS_COLORS[code] ?? FALLBACK_COLOR, off: option?.finalState === true };
  };

  const shown = items.filter((a) => `${a.title} ${a.instructions}`.toLowerCase().includes(q.toLowerCase()));
  const empty = !loading && !error && items.length === 0;

  return (
    <>
      <header className="list-head">
        <div><h1>Alertas</h1><p>Consulta las alertas en el campus.</p></div>
        {access.canCreate && <a className="btn-create" href="#/alertas/nueva"><Plus />Crear alerta</a>}
      </header>
      <main className="list-main">
        <div className="list-tools">
          <AlertFilterBar groups={groups} selected={selected} onToggle={toggleFilter} onClear={clearFilter}
            loading={filtersLoading} error={filtersError} onRetry={retryFilters} />
          <div className="searchbar">
            <Search /><input aria-label="Buscar alertas" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={reload}>Reintentar</button></p>}
        {!(error && items.length === 0) && <section className={`alist${empty ? ' empty' : ''}`}>
          {loading && items.length === 0 && <p className="notice">Cargando alertas…</p>}
          {empty && <><EmptyLogo /><h2>{hasSelection(selected) ? EMPTY_FILTERED : EMPTY_ALL}</h2></>}
          {shown.map((a, i) => {
            const s = statusMeta(a.status);
            const scope = scopeText(a.scope, catalog, a.scopes);
            const rec = recipientsText(a.recipients);
            const manage = access.canManage(a.origin);
            return (
              <article key={a.id} className={`arow${s.off ? ' off' : ''}`} style={{ borderTopColor: s.color, borderTopWidth: i === 0 ? 7 : 5 }}>
                <div className="abody"><h3>{a.title}</h3><p className="adesc">{a.instructions}</p><p className="al"><b>Alcance:</b> {scope} · {rec}</p></div>
                <span className="abadge" style={{ background: s.color }}>{s.label}</span>
                <div className="aact">
                  {manage && (a.status === 'DRAFT' || a.status === 'SCHEDULED') && <a href={`#/alertas/${a.id}/editar`} aria-label={`Editar ${a.title}`}><Edit /></a>}
                  {manage && !s.off && <button type="button" onClick={() => act(() => alertsApi.archive(a.id), '¿Archivar esta alerta?')}>Archivar</button>}
                </div>
              </article>
            );
          })}
        </section>}
        {pg.page + 1 < pg.totalPages && <button type="button" className="btn white more" disabled={loading} onClick={loadMore}>Cargar más</button>}
      </main>
    </>
  );
}
