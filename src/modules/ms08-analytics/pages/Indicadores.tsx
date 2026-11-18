import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventData, EventStatus, EventSummary, Page } from '../../ms06-drills/types';
import { STATUS_LABEL } from '../../ms06-drills/utils/labels';
import ErrorNotice from '../components/ErrorNotice';
import { analyticsApi, PAGE_SIZE } from '../services/analytics';
import type { EventIndicators, IndicatorValue } from '../types';
import { formatBogota, formatIndicator, indicatorLabel, isUuid, stateLabel } from '../utils/format';
import '../../ms06-drills/styles/events.css';
import '../styles/analytics.css';

const PENDING_TEXT = 'Pendiente de cálculo';

function Pending({ finished }: { finished: boolean }) {
  return (
    <div className="an-pending" role="status">
      <b>{PENDING_TEXT}</b>
      <span>{finished
        ? 'MS08 todavía no recibió los datos de este evento. El resumen aparece cuando termine el cálculo.'
        : 'El resumen se calcula cuando el evento finaliza.'}</span>
    </div>
  );
}

function IndicatorCard({ name, value }: { name: string; value: IndicatorValue }) {
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    const total = entries.reduce((n, [, v]) => n + v, 0);
    return (
      <div className="ev-kpi">
        <small>{indicatorLabel(name)}</small><b>{total.toLocaleString('es-CO')}</b>
        <div className="an-breakdown">{entries.map(([k, v]) => <span key={k}><span>{stateLabel(k)}</span><b>{v.toLocaleString('es-CO')}</b></span>)}</div>
      </div>
    );
  }
  const text = typeof value === 'number' ? formatIndicator(name, value)
    : typeof value === 'boolean' ? (value ? 'Sí' : 'No')
      : value ?? '—';
  return <div className="ev-kpi"><small>{indicatorLabel(name)}</small><b>{text}</b></div>;
}

/** Resumen de indicadores de un evento (#/indicadores/{eventoId}). */
function EventIndicatorsView({ session, eventoId }: { session: Session; eventoId: string }) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [data, setData] = useState<EventIndicators | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // El nombre y el estado vienen de MS06; si no se pueden consultar, el resumen se muestra igual
    const detail = await eventsApi.detail(session, eventoId).then((d) => d.event).catch(() => null);
    setEvent(detail);
    try {
      // Un evento que no ha finalizado no tiene resumen: no se consulta a MS08
      setData(detail && detail.status !== 'FINISHED'
        ? { eventoId, pendiente: true, calculadoEn: null, tipoEvento: null, indicadores: {} }
        : await analyticsApi.indicators(session, eventoId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [session, eventoId]);

  useEffect(() => { load(); }, [load]);

  const finished = event ? event.status === 'FINISHED' : true;
  const kind = event ? (event.simulacro ? 'Simulacro' : 'Evento real')
    : data?.tipoEvento ? (data.tipoEvento.toUpperCase() === 'SIMULACRO' ? 'Simulacro' : 'Evento real') : null;
  const entries = Object.entries(data?.indicadores ?? {});

  return (
    <>
      <header className="ev-head">
        <div>
          <a className="plink" href="#/indicadores">← Volver a indicadores</a>
          <h1>{event?.name ?? 'Indicadores del evento'}</h1>
          <p>
            {[kind, event ? STATUS_LABEL[event.status] : null, event?.endedAt ? `Finalizó ${formatBogota(event.endedAt)}` : null]
              .filter(Boolean).join(' · ') || <span className="an-mono">{eventoId}</span>}
          </p>
        </div>
      </header>
      <main className="ev-main">
        {loading && <p className="notice" role="status">Cargando indicadores…</p>}
        {!loading && error !== null && <ErrorNotice error={error} onRetry={load} />}
        {!loading && error === null && data && (data.pendiente ? <Pending finished={finished} /> : (
          <>
            <section className="ev-kpis" aria-label="Indicadores del evento">
              {entries.map(([k, v]) => <IndicatorCard key={k} name={k} value={v} />)}
            </section>
            {data.calculadoEn && <p className="help">Calculado {formatBogota(data.calculadoEn)} (hora de Bogotá).</p>}
          </>
        ))}
      </main>
    </>
  );
}

const TABS: { status: EventStatus | ''; label: string }[] = [
  { status: 'FINISHED', label: 'Finalizados' },
  { status: '', label: 'Todos' },
];

/** Lista de eventos (de MS06) para elegir de cuál ver el resumen que calcula MS08. */
function EventPicker({ session }: { session: Session }) {
  const [status, setStatus] = useState<EventStatus | ''>('FINISHED');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<EventSummary> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [manualId, setManualId] = useState('');
  const [manualError, setManualError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await eventsApi.search(session, { status, page, size: PAGE_SIZE }));
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [session, status, page]);

  useEffect(() => { load(); }, [load]);

  const open = () => {
    if (!isUuid(manualId)) { setManualError('Escriba un id de evento válido (UUID).'); return; }
    window.location.hash = `#/indicadores/${manualId.trim().toLowerCase()}`;
  };

  const items = data?.content ?? [];
  // Sin permiso de lectura en Eventos la lista no se puede mostrar, pero el resumen sí se puede consultar por id
  const forbidden = error instanceof ApiError && error.status === 403;

  return (
    <>
      <header className="ev-head">
        <div>
          <h1>Indicadores</h1>
          <p>Resumen que se calcula al finalizar cada evento. Elija un evento para ver sus indicadores.</p>
        </div>
      </header>
      <main className="ev-main">
        <div className="ev-tools">
          <div className="ev-tabs" role="group" aria-label="Filtrar por estado">
            {TABS.map((t) => (
              <button key={t.label} type="button" className="ev-tab" aria-pressed={status === t.status}
                onClick={() => { setStatus(t.status); setPage(0); }}>{t.label}</button>
            ))}
          </div>
          <form className="an-pick" onSubmit={(e) => { e.preventDefault(); open(); }}>
            <input aria-label="Id del evento" placeholder="Consultar por id de evento" value={manualId}
              aria-invalid={manualError ? true : undefined} onChange={(e) => { setManualId(e.target.value); setManualError(''); }} />
            <button type="submit" className="btn white">Ver</button>
          </form>
        </div>
        {manualError && <p className="notice err" role="alert">{manualError}</p>}

        {forbidden && <p className="notice" role="status">No tiene permiso para listar eventos. Consulte el resumen escribiendo el id del evento.</p>}
        {error !== null && !forbidden && <ErrorNotice error={error} onRetry={load} />}
        {loading && <p className="notice" role="status">Cargando eventos…</p>}
        {!loading && data && items.length === 0 && (
          <div className="ev-empty">{status === 'FINISHED' ? 'Todavía no hay eventos finalizados.' : 'Todavía no hay eventos.'}</div>
        )}

        {items.length > 0 && (
          <table className="ev-table">
            <thead><tr><th>Evento</th><th>Estado</th><th>Finalizó</th><th>Indicadores</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td><div className="t">{e.name}</div><div className="s">{e.simulacro ? 'Simulacro' : 'Evento real'}</div></td>
                  <td><span className={`st ${e.status}`}>{STATUS_LABEL[e.status]}</span></td>
                  <td>{e.endedAt ? formatBogota(e.endedAt) : '—'}</td>
                  <td>{e.status === 'FINISHED' ? 'Disponible al abrir' : <span className="st PENDIENTE">{PENDING_TEXT}</span>}</td>
                  <td><div className="ev-acts"><a className="btn white" href={`#/indicadores/${e.id}`}>Ver indicadores</a></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && data.totalPages > 1 && (
          <div className="ev-pager">
            <span>Página {data.page + 1} de {data.totalPages} · {data.totalElements} eventos</span>
            <div>
              <button type="button" className="ev-tab" disabled={loading || page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</button>
              <button type="button" className="ev-tab" disabled={loading || page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
            </div>
          </div>
        )}
        <p className="help">Fechas en hora de Bogotá. Los eventos que no han finalizado aparecen como pendientes de cálculo.</p>
      </main>
    </>
  );
}

export default function Indicadores({ session, eventoId }: { session: Session; eventoId?: string }) {
  return eventoId ? <EventIndicatorsView session={session} eventoId={eventoId} /> : <EventPicker session={session} />;
}
