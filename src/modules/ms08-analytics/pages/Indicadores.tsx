import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventData, EventStatus, EventSummary, Page } from '../../ms06-drills/types';
import { STATUS_LABEL, scopeLabelIn } from '../../ms06-drills/utils/labels';
import ErrorNotice from '../components/ErrorNotice';
import { multiEventHref } from '../hooks/useEventNames';
import { analyticsApi, PAGE_SIZE } from '../services/analytics';
import type { Bucket, EventIndicators, IndicatorsResult, TimeStat } from '../types';
import { MAX_EVENTS, MIN_COMPARE } from '../types';
import { KIND_LABEL, bucketLabel, formatBogota, formatCount, formatPercent, formatSeconds, isUuid } from '../utils/format';
import '../../ms06-drills/styles/events.css';
import '../styles/analytics.css';

const PENDING_TEXT = 'Pendiente de cálculo';

function Pending({ finished }: { finished: boolean }) {
  return (
    <div className="an-pending" role="status">
      <b>{PENDING_TEXT}</b>
      <span>{finished
        ? 'MS08 todavía no recibió los datos de este evento. El resumen aparece cuando lleguen.'
        : 'El resumen se calcula cuando el evento finaliza.'}</span>
    </div>
  );
}

function Breakdown({ title, items, empty }: { title: string; items: Bucket[]; empty: string }) {
  return (
    <section className="ev-card">
      <h2>{title}</h2>
      {items.length === 0 ? <p className="help">{empty}</p> : (
        <div className="an-breakdown">
          {items.map((b) => (
            <span key={b.clave}><span>{bucketLabel(b.clave)}</span><b>{formatCount(b.cantidad)}{b.porcentaje != null ? ` · ${formatPercent(b.porcentaje)}` : ''}</b></span>
          ))}
        </div>
      )}
    </section>
  );
}

const samples = (t: TimeStat) => (t.muestras ? `${formatCount(t.muestras)} muestras` : 'Sin muestras');

function Summary({ data }: { data: EventIndicators }) {
  const { catalog } = useScopeCatalog();
  const { notificacion: n, participacion: p, incidentes: i, tiempos: t } = data;
  return (
    <>
      <section className="ev-kpis" aria-label="Notificación y participación">
        <div className="ev-kpi"><small>Confirmación de alertas</small><b>{formatPercent(n.porcentajeConfirmacion)}</b>
          <span>{formatCount(n.confirmados)} de {formatCount(n.destinatarios)} destinatarios</span></div>
        <div className="ev-kpi"><small>Participación en check-in</small><b>{formatPercent(p.porcentajeParticipacion)}</b>
          <span>{formatCount(p.participantes)} participantes</span></div>
        <div className="ev-kpi hot"><small>Solicitaron asistencia</small><b>{formatCount(p.solicitaronAsistencia)}</b>
          <span>{formatPercent(p.porcentajeAsistencia)} de los participantes</span></div>
        <div className="ev-kpi"><small>Incidentes</small><b>{formatCount(i.total)}</b>
          <span>{i.porCategoria.length ? `${i.porCategoria.length} ${i.porCategoria.length === 1 ? 'categoría' : 'categorías'}` : 'Sin incidentes'}</span></div>
      </section>
      <section className="ev-kpis" aria-label="Tiempos promedio">
        <div className="ev-kpi"><small>Tiempo hasta el check-in</small><b>{formatSeconds(t.hastaCheckin.promedioSegundos)}</b><span>{samples(t.hastaCheckin)}</span></div>
        <div className="ev-kpi"><small>Tiempo de evacuación</small><b>{formatSeconds(t.evacuacion.promedioSegundos)}</b><span>{samples(t.evacuacion)}</span></div>
        <div className="ev-kpi hot"><small>Hasta la primera atención</small><b>{formatSeconds(t.hastaPrimeraAtencion.promedioSegundos)}</b><span>{samples(t.hastaPrimeraAtencion)}</span></div>
        <div className="ev-kpi"><small>Alertas enviadas</small><b>{formatCount(n.enviados)}</b><span>{formatCount(n.fallidos)} fallidas</span></div>
      </section>
      <div className="an-cols">
        <Breakdown title="Participantes por estado" items={p.porEstado} empty="Nadie registró check-in." />
        <Breakdown title="Puntos de encuentro" items={p.puntosEncuentro} empty="Sin puntos de encuentro registrados." />
        <Breakdown title="Incidentes por categoría" items={i.porCategoria} empty="No se reportaron incidentes." />
      </div>
      <section className="ev-card">
        <h2>Ubicaciones más lentas en atender</h2>
        {t.ubicacionesMasLentas.length === 0 ? <p className="help">No hay atenciones registradas.</p> : (
          <table className="ev-table">
            <thead><tr><th>Ubicación</th><th>Tiempo hasta la primera atención</th><th>Muestras</th></tr></thead>
            <tbody>
              {t.ubicacionesMasLentas.map((u) => (
                <tr key={`${u.ubicacionTipo}-${u.ubicacionId}`}>
                  <td>{scopeLabelIn(u.ubicacionId, catalog)}</td><td>{formatSeconds(u.promedioSegundos)}</td><td>{formatCount(u.muestras)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {data.calculadoEn && <p className="help">Calculado {formatBogota(data.calculadoEn)} (hora de Bogotá) con los datos recibidos hasta ese momento.</p>}
    </>
  );
}

/** Resumen de indicadores de un evento (#/indicadores/{eventoId}). */
function EventIndicatorsView({ session, eventoId }: { session: Session; eventoId: string }) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [result, setResult] = useState<IndicatorsResult | null>(null);
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
      setResult(detail && detail.status !== 'FINISHED' ? { pendiente: true } : await analyticsApi.indicators(session, eventoId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [session, eventoId]);

  useEffect(() => { load(); }, [load]);

  const finished = event ? event.status === 'FINISHED' : true;
  const data = result && !result.pendiente ? result.data : null;
  const kindKey = event ? (event.simulacro ? 'SIMULACRO' : 'REAL') : data?.tipoEvento;
  const started = event?.startedAt ?? data?.inicioEvento;

  return (
    <>
      <header className="ev-head">
        <div>
          <a className="plink" href="#/indicadores">← Volver a indicadores</a>
          <h1>{event?.name ?? 'Indicadores del evento'}</h1>
          <p>
            {[kindKey ? KIND_LABEL[kindKey] : null, event ? STATUS_LABEL[event.status] : null,
              started ? `Inició ${formatBogota(started)}` : null, event?.endedAt ? `Finalizó ${formatBogota(event.endedAt)}` : null]
              .filter(Boolean).join(' · ') || <span className="an-mono">{eventoId}</span>}
          </p>
        </div>
        {data && <a className="btn white" href={multiEventHref('ubicaciones', [eventoId])}>Ver por ubicación</a>}
      </header>
      <main className="ev-main">
        {loading && <p className="notice" role="status">Cargando indicadores…</p>}
        {!loading && error !== null && <ErrorNotice error={error} onRetry={load} />}
        {!loading && error === null && result?.pendiente && <Pending finished={finished} />}
        {!loading && error === null && data && <Summary data={data} />}
      </main>
    </>
  );
}

interface Selected { id: string; simulacro: boolean }

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
  // Eventos elegidos para comparar o ver por ubicación; se conservan al cambiar de página
  const [selected, setSelected] = useState<Selected[]>([]);

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

  const toggle = (e: EventSummary) => setSelected((list) => (list.some((x) => x.id === e.id)
    ? list.filter((x) => x.id !== e.id)
    : [...list, { id: e.id, simulacro: e.simulacro }]));
  const isSelected = (id: string) => selected.some((x) => x.id === id);
  // MS08 solo acepta eventos del mismo tipo y hasta 10
  const selectedKind = selected[0]?.simulacro;
  const canSelect = (e: EventSummary) => isSelected(e.id)
    || (selected.length < MAX_EVENTS && (selectedKind === undefined || selectedKind === e.simulacro));
  const ids = selected.map((x) => x.id);

  const items = data?.content ?? [];
  // Sin permiso de lectura en Eventos la lista no se puede mostrar, pero el resumen sí se puede consultar por id
  const forbidden = error instanceof ApiError && error.status === 403;

  return (
    <>
      <header className="ev-head">
        <div>
          <h1>Indicadores</h1>
          <p>Resumen de cada evento: notificación, participación, incidentes y tiempos de respuesta. Elija un evento para verlo.</p>
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

        <div className="an-sel" role="region" aria-label="Eventos seleccionados">
          <span>{selected.length === 0
            ? `Seleccione eventos finalizados del mismo tipo (hasta ${MAX_EVENTS}) para compararlos o verlos por ubicación.`
            : `${selected.length} ${selected.length === 1 ? 'evento seleccionado' : 'eventos seleccionados'} · ${selectedKind ? 'simulacros' : 'eventos reales'}`}</span>
          {selected.length > 0 && (
            <div>
              <button type="button" className="plink" onClick={() => setSelected([])}>Quitar selección</button>
              <a className="btn white" href={multiEventHref('ubicaciones', ids)}>Ver por ubicación</a>
              {selected.length >= MIN_COMPARE
                ? <a className="btn deep" href={multiEventHref('comparar', ids)}>Comparar ({selected.length})</a>
                : <span className="help">Elija al menos {MIN_COMPARE} para comparar</span>}
            </div>
          )}
        </div>

        {forbidden && <p className="notice" role="status">No tiene permiso para listar eventos. Consulte el resumen escribiendo el id del evento.</p>}
        {error !== null && !forbidden && <ErrorNotice error={error} onRetry={load} />}
        {loading && <p className="notice" role="status">Cargando eventos…</p>}
        {!loading && data && items.length === 0 && (
          <div className="ev-empty">{status === 'FINISHED' ? 'Todavía no hay eventos finalizados.' : 'Todavía no hay eventos.'}</div>
        )}

        {items.length > 0 && (
          <table className="ev-table">
            <thead><tr><th aria-label="Seleccionar" /><th>Evento</th><th>Estado</th><th>Finalizó</th><th>Indicadores</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td>
                    {e.status === 'FINISHED' && (
                      <input type="checkbox" aria-label={`Seleccionar ${e.name}`} checked={isSelected(e.id)} disabled={!canSelect(e)}
                        title={canSelect(e) ? undefined : selected.length >= MAX_EVENTS ? `Máximo ${MAX_EVENTS} eventos` : 'Solo eventos del mismo tipo'}
                        onChange={() => toggle(e)} />
                    )}
                  </td>
                  <td><div className="t">{e.name}</div><div className="s">{e.simulacro ? 'Simulacro' : 'Evento real'}</div></td>
                  <td><span className={`st ${e.status}`}>{STATUS_LABEL[e.status]}</span></td>
                  <td>{e.endedAt ? formatBogota(e.endedAt) : '—'}</td>
                  <td>{e.status === 'FINISHED' ? 'Disponible' : <span className="st PENDIENTE">{PENDING_TEXT}</span>}</td>
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
