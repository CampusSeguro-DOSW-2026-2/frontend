import { useCallback, useEffect, useState } from 'react';
import { Edit, Filter, Logo, Plus, Search } from '../components/Icons';
import { alertsApi, type Alert, type AlertStatus } from '../services/alerts';
import { ROLE_ITEMS, SCOPE_ITEMS, labelOf, listEs, scopeIdsOf } from '../services/catalog';

const ST: Record<AlertStatus, { label: string; color: string; off?: boolean }> = {
  DRAFT: { label: 'Borrador', color: '#0F172A' }, SCHEDULED: { label: 'Programada', color: '#2563EB' },
  ACTIVE: { label: 'Activa', color: '#990000' }, ENDED: { label: 'Finalizada', color: '#5A5C60', off: true },
  ARCHIVED: { label: 'Archivada', color: '#5A5C60', off: true },
};

export default function AlertList() {
  const [items, setItems] = useState<Alert[]>([]);
  const [pg, setPg] = useState({ page: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<AlertStatus | ''>('');
  const [showFilter, setShowFilter] = useState(false);

  const load = useCallback(async (page: number, append: boolean) => {
    setLoading(true); setError('');
    try {
      const p = await alertsApi.list({ status: status || undefined, page, size: 10 });
      const full = await Promise.all(p.content.map((s) => alertsApi.get(s.id))); // el resumen no trae instrucciones ni destinatarios
      setItems((cur) => (append ? [...cur, ...full] : full)); setPg({ page: p.page, totalPages: p.totalPages });
    } catch (e) { setError(e instanceof Error ? e.message : 'Error inesperado.'); } finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(0, false); }, [load]);

  const act = async (fn: () => Promise<unknown>, ask: string) => {
    if (!window.confirm(ask)) return;
    try { await fn(); await load(0, false); } catch (e) { setError(e instanceof Error ? e.message : 'Error inesperado.'); }
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
              <select id="fs" value={status} onChange={(e) => setStatus(e.target.value as AlertStatus | '')}>
                <option value="">Todos</option>{(Object.keys(ST) as AlertStatus[]).map((s) => <option key={s} value={s}>{ST[s].label}</option>)}
              </select></div>
          )}
        </div>
        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={() => load(0, false)}>Reintentar</button></p>}
        <section className={`alist${empty ? ' empty' : ''}`}>
          {loading && items.length === 0 && <p className="notice">Cargando alertas…</p>}
          {empty && <><Logo size={340} /><h2>El campus está seguro. No hay alertas</h2></>}
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
        </section>
        {pg.page + 1 < pg.totalPages && <button type="button" className="btn white more" disabled={loading} onClick={() => load(pg.page + 1, true)}>Cargar más</button>}
      </main>
    </>
  );
}
