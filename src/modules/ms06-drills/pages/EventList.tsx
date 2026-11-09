import { useCallback, useEffect, useState } from 'react';
import { Edit, Plus, Search } from '../../../shared/components/Icons';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { canManageEvent, eventsApi } from '../services/events';
import type { EventStatus, EventSummary, Page } from '../types';
import { STATUS_LABEL, formatDate, scopeLabel } from '../utils/labels';
import '../styles/events.css';

const FILTERS: (EventStatus | '')[] = ['', 'DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'FINISHED'];
const EDITABLE: EventStatus[] = ['DRAFT', 'SCHEDULED', 'IN_PROGRESS'];
const PAGE_SIZE = 20;

/** RF-EVE-03: panel de gestión de eventos (búsqueda por título y filtro por estado). */
export default function EventList({ session, canManage }: { session: Session; canManage: boolean }) {
  const [status, setStatus] = useState<EventStatus | ''>('');
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<EventSummary> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await eventsApi.search(session, { title: query, status, page, size: PAGE_SIZE }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [session, query, status, page]);

  useEffect(() => { load(); }, [load]);

  const items = data?.content ?? [];
  const scopeText = (e: EventSummary) => (e.scope.length ? e.scope.map((s) => scopeLabel(s.id)).join(', ') : 'Sin alcance');

  return (
    <>
      <header className="ev-head">
        <div>
          <h1>Eventos</h1>
          <p>Simulacros y emergencias. Solo puede haber un evento en ejecución a la vez.</p>
        </div>
        {canManage && <a className="btn light" href="#/eventos/nuevo"><Plus />Crear evento</a>}
      </header>
      <main className="ev-main">
        <div className="ev-tools">
          <div className="ev-tabs" role="group" aria-label="Filtrar por estado">
            {FILTERS.map((f) => (
              <button key={f || 'all'} type="button" className="ev-tab" aria-pressed={status === f}
                onClick={() => { setStatus(f); setPage(0); }}>
                {f ? STATUS_LABEL[f] : 'Todos'}
              </button>
            ))}
          </div>
          <form className="searchbar" role="search" onSubmit={(e) => { e.preventDefault(); setQuery(title); setPage(0); }}>
            <input aria-label="Buscar por título" placeholder="Buscar por título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button type="submit" aria-label="Buscar"><Search /></button>
          </form>
        </div>

        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={load}>Reintentar</button></p>}
        {loading && !data && <p className="notice" role="status">Cargando eventos…</p>}

        {data && items.length === 0 && (
          <div className="ev-empty">{query || status ? 'No hay eventos que coincidan con la búsqueda.' : 'Todavía no hay eventos.'}</div>
        )}

        {items.length > 0 && (
          <table className="ev-table">
            <thead><tr><th>Evento</th><th>Inicio</th><th>Alcance</th><th>Participantes</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className={e.status === 'IN_PROGRESS' ? 'live' : undefined}>
                  <td><div className="t">{e.name}</div><div className="s">{e.simulacro ? 'Simulacro' : 'Evento real'}</div></td>
                  <td>{formatDate(e.startedAt ?? e.startDate)}</td>
                  <td>{scopeText(e)}</td>
                  <td>{e.participantRoles.length || '—'}{e.participantRoles.length ? ' grupos' : ''}</td>
                  <td><span className={`st ${e.status}`}>{STATUS_LABEL[e.status]}</span></td>
                  <td>
                    <div className="ev-acts">
                      {canManageEvent(session, e.simulacro) && EDITABLE.includes(e.status) && (
                        <a className="ev-icon" href={`#/eventos/${e.id}/editar`} aria-label={`Editar ${e.name}`} title="Editar"><Edit /></a>
                      )}
                      <a className={`btn ${e.status === 'IN_PROGRESS' ? 'deep' : 'white'}`} href={`#/eventos/${e.id}`}>
                        {e.status === 'IN_PROGRESS' ? 'Ver en vivo' : e.status === 'FINISHED' ? 'Ver resultados' : 'Ver'}
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && data.totalPages > 1 && (
          <div className="ev-pager">
            <span>Página {data.page + 1} de {data.totalPages} · {data.totalElements} eventos</span>
            <div>
              <button type="button" className="ev-tab" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</button>
              <button type="button" className="ev-tab" disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
            </div>
          </div>
        )}
        {canManage && <p className="help">Se puede editar en Borrador, Programado y En ejecución. Si editas un evento en ejecución, se reenvían las alertas con la información nueva.</p>}
      </main>
    </>
  );
}
