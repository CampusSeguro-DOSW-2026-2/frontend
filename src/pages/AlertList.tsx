import { useEffect, useState } from 'react';
import { Edit, Filter, Logo, Plus, Search } from '../components/Icons';
import { alertsApi, type Alert, type AlertStatus } from '../services/alerts';
import { ROLE_ITEMS, SCOPE_ITEMS, labelOf, listEs, scopeIdsOf } from '../services/catalog';

const ST: Record<AlertStatus, { label: string; color: string; off?: boolean }> = {
  DRAFT: { label: 'Borrador', color: '#0F172A' }, SCHEDULED: { label: 'Programada', color: '#2563EB' },
  ACTIVE: { label: 'Activa', color: '#990000' }, ENDED: { label: 'Finalizada', color: '#5A5C60', off: true },
  ARCHIVED: { label: 'Archivada', color: '#5A5C60', off: true },
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Error inesperado.');
const fetchPage = async (status: AlertStatus | '', page: number) => {
  const p = await alertsApi.list({ status: status || undefined, page, size: 10 });
  const items = await Promise.all(p.content.map((s) => alertsApi.get(s.id))); // el resumen no trae instrucciones ni destinatarios
  return { items, page: p.page, totalPages: p.totalPages };
};

export default function AlertList() {
  const [items, setItems] = useState<Alert[]>([]);
  const [pg, setPg] = useState({ page: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<AlertStatus | ''>('');
  const [showFilter, setShowFilter] = useState(false);

  const [reloads, setReloads] = useState(0);

  // Primera página: el estado solo se actualiza al llegar la respuesta; los eventos marcan "cargando".
  useEffect(() => {
    let ignore = false;
    fetchPage(status, 0)
      .then((r) => { if (!ignore) { setItems(r.items); setPg({ page: r.page, totalPages: r.totalPages }); } })
      .catch((e: unknown) => { if (!ignore) setError(errMsg(e)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [status, reloads]);
  const reload = () => { setLoading(true); setError(''); setReloads((n) => n + 1); };
  const changeStatus = (s: AlertStatus | '') => { if (s === status) return; setLoading(true); setError(''); setItems([]); setStatus(s); };
  const loadMore = async () => {
    setLoading(true);
    try {
      const r = await fetchPage(status, pg.page + 1);
      setItems((cur) => [...cur, ...r.items]); setPg({ page: r.page, totalPages: r.totalPages });
    } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  };

  const act = async (fn: () => Promise<unknown>, ask: string) => {
    if (!window.confirm(ask)) return;
    try { await fn(); reload(); } catch (e) { setError(errMsg(e)); }
  };
  const shown = items.filter((a) => `${a.title} ${a.instructions}`.toLowerCase().includes(q.toLowerCase()));
  const empty = !loading && !error && items.length === 0;

  return (
    <>
      <header className="list-head">
        <div><h1>Alertas</h1><p>Consulta las alertas en el campus.</p></div>
        <a className="btn-create" href="#/alertas/nueva"><Plus />Crear alerta</a>
      </header>
      <main className="list-main">
        <div className="searchbar">
          <Search /><input aria-label="Buscar alertas" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" aria-label="Filtrar por estado" aria-expanded={showFilter} onClick={() => setShowFilter(!showFilter)}><Filter /></button>
          {showFilter && (
            <div className="filterpop"><label htmlFor="fs">Estado</label>
              <select id="fs" value={status} onChange={(e) => changeStatus(e.target.value as AlertStatus | '')}>
                <option value="">Todos</option>{(Object.keys(ST) as AlertStatus[]).map((s) => <option key={s} value={s}>{ST[s].label}</option>)}
              </select></div>
          )}
        </div>
        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={reload}>Reintentar</button></p>}
        {!(error && items.length === 0) && <section className={`alist${empty ? ' empty' : ''}`}>
          {loading && items.length === 0 && <p className="notice">Cargando alertas…</p>}
          {empty && <><Logo size={345} variant="black" /><h2>El campus está seguro. No hay alertas</h2></>}
          {shown.map((a, i) => {
            const s = ST[a.status];
            const scope = a.scope.type === 'CAMPUS' ? 'Todo el campus' : scopeIdsOf(a.scope).map((id) => labelOf(SCOPE_ITEMS, id)).join(', ');
            const rec = listEs(a.recipients.map((r) => labelOf(ROLE_ITEMS, r.id)));
            return (
              <article key={a.id} className={`arow${s.off ? ' off' : ''}`} style={{ borderTopColor: s.color, borderTopWidth: i === 0 ? 7 : 5 }}>
                <div className="abody"><h3>{a.title}</h3><p className="adesc">{a.instructions}</p><p className="al"><b>Alcance:</b> {scope} · {rec}</p></div>
                <span className="abadge" style={{ background: s.color }}>{s.label}</span>
                <div className="aact">
                  {(a.status === 'DRAFT' || a.status === 'SCHEDULED') && <a href={`#/alertas/${a.id}/editar`} aria-label={`Editar ${a.title}`}><Edit /></a>}
                  {a.status === 'ACTIVE' && <button type="button" onClick={() => act(() => alertsApi.end(a.id), '¿Finalizar esta alerta?')}>Finalizar</button>}
                  {a.status === 'ENDED' && <button type="button" onClick={() => act(() => alertsApi.archive(a.id), '¿Archivar esta alerta?')}>Archivar</button>}
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
