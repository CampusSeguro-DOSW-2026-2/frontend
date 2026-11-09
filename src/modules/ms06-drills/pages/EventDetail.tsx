import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { canManageEvent, eventsApi } from '../services/events';
import type { EventDetail as Detail, Evaluation, EventWarning, Monitoring } from '../types';
import { CHECKIN_LABEL, ROLE_LABEL, STATUS_LABEL, formatDate, formatDuration, scopeLabel, warningText } from '../utils/labels';
import '../styles/events.css';

const REFRESH_MS = 15000;
const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(Number(v))}%`);
const statusName = (k: string) => CHECKIN_LABEL[k] ?? k.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

// "Todavía no hay registros" ya lo dicen las tarjetas; como aviso amarillo solo quedan los problemas reales
const INFO_ONLY = ['NO_CHECKINS', 'NO_INCIDENTS', 'NO_BRIGADIERS', 'NO_RECORDS'];

function Warnings({ items }: { items: EventWarning[] }) {
  const shown = items.filter((w) => !INFO_ONLY.includes(w.code));
  if (!shown.length) return null;
  return <>{shown.map((w) => <div key={w.code + w.message} className="ev-warn" role="status">{warningText(w)}</div>)}</>;
}

function Live({ m }: { m: Monitoring }) {
  const c = m.checkIn;
  const i = m.incidents;
  return (
    <>
      <section className="ev-kpis" aria-label="Indicadores en vivo">
        <div className="ev-kpi"><small>Check-ins registrados</small><b>{c?.totalCheckins ?? '—'}</b>
          <div className="ev-bar"><i style={{ width: `${Math.min(100, Number(c?.participationPct ?? 0))}%` }} /></div>
          <span>Participación {pct(c?.participationPct)}</span></div>
        <div className="ev-kpi hot"><small>Incidentes pendientes</small><b>{i?.pending ?? '—'}</b><span>{i ? `${i.totalIncidents} en total` : 'Sin datos de incidentes'}</span></div>
        <div className="ev-kpi"><small>Atendidos / resueltos</small><b>{i ? `${i.attended} / ${i.resolved}` : '—'}</b><span>Atención media {formatDuration(i?.avgAttentionSeconds)}</span></div>
        <div className="ev-kpi"><small>Brigadistas activos</small><b>{m.brigadiersByZone.reduce((n, z) => n + z.activeCount, 0)}</b><span>en {m.brigadiersByZone.length} zonas</span></div>
      </section>
      <div className="ev-cols">
        <section className="ev-card">
          <h2>Brigadistas por zona</h2>
          {m.brigadiersByZone.length === 0 && <p className="help">Todavía no hay brigadistas asignados.</p>}
          {m.brigadiersByZone.map((z) => (
            <div className="ev-zone" key={z.zoneId}>
              <b>{scopeLabel(z.zoneId)}</b>
              <span>{z.activeCount} activos · {z.brigadiers.map((b) => b.name).join(', ') || '—'}</span>
            </div>
          ))}
          {m.brigadiersSyncedAt && <span className="help">Actualizado {formatDate(m.brigadiersSyncedAt)}</span>}
        </section>
        <section className="ev-card">
          <h2>Check-in por estado</h2>
          {!c || Object.keys(c.byStatus).length === 0
            ? <p className="help">No se han registrado check-ins.</p>
            : Object.entries(c.byStatus).map(([k, v]) => <div className="ev-zone" key={k}><span>{statusName(k)}</span><b>{v}</b></div>)}
        </section>
      </div>
    </>
  );
}

function Results({ e }: { e: Evaluation }) {
  if (e.noRecords) return <p className="notice">Todavía no hay registros de check-in, solicitudes de ayuda ni incidentes para este evento.</p>;
  return (
    <>
      {!e.complete && <div className="ev-warn" role="status">Algunas cifras aún no llegan de check-in o de brigadistas; se completan solas en unos minutos.</div>}
      <section className="ev-kpis" aria-label="Resultados">
        <div className="ev-kpi"><small>Participación en check-in</small><b>{pct(e.checkinParticipationPct)}</b><span>{e.totalCheckins ?? '—'} check-ins</span></div>
        <div className="ev-kpi"><small>Incidentes</small><b>{e.totalIncidents ?? '—'}</b><span>{e.casesResolved ?? 0} resueltos</span></div>
        <div className="ev-kpi hot"><small>Tiempo medio de atención</small><b>{formatDuration(e.avgAttentionSeconds)}</b><span>{e.casesAttended ?? 0} casos atendidos</span></div>
        <div className="ev-kpi"><small>Brigadistas con casos</small><b>{e.brigadiers.length}</b><span>desempeño abajo</span></div>
      </section>
      <section className="ev-card">
        <h2>Desempeño de la brigada</h2>
        {e.brigadiers.length === 0 && <p className="help">Ningún brigadista atendió casos.</p>}
        {e.brigadiers.map((b) => (
          <div className="ev-zone" key={b.brigadierId}><span>{b.brigadierId}</span><b>{b.casesAttended} atendidos · {b.casesResolved} resueltos</b></div>
        ))}
      </section>
    </>
  );
}

/** RF-EVE-03 y RF-EVE-04: detalle del evento, monitoreo en vivo, finalizar y resultados. */
export default function EventDetail({ session, id, canManage }: { session: Session; id: string; canManage: boolean }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishWarnings, setFinishWarnings] = useState<EventWarning[]>([]);

  const load = useCallback(async () => {
    try {
      setData(await eventsApi.detail(session, id));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);
  const live = data?.event.status === 'IN_PROGRESS';
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [live, load]);

  const finish = async () => {
    setFinishing(true);
    try {
      const res = await eventsApi.finish(session, id);
      setFinishWarnings(res.warnings);
      setConfirm(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
      setConfirm(false);
    } finally {
      setFinishing(false);
    }
  };

  if (!data) {
    return <main className="ev-main">{error ? <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={load}>Reintentar</button></p> : <p className="notice" role="status">Cargando evento…</p>}</main>;
  }
  const ev = data.event;
  const manage = canManage && canManageEvent(session, ev.simulacro);
  const editable = manage && ev.status !== 'FINISHED';

  return (
    <>
      <header className="ev-head">
        <div>
          <a className="back" href="#/eventos">← Eventos</a>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
            <span className="st" style={{ background: '#fff', color: 'var(--red)' }}>{live ? '● ' : ''}{STATUS_LABEL[ev.status]}</span>
            <span style={{ fontSize: 14 }}>{ev.simulacro ? 'Simulacro' : 'Evento real'}</span>
          </div>
          <h1 style={{ marginTop: 8 }}>{ev.name}</h1>
          <p>{live ? `Inició ${formatDate(ev.startedAt)}` : ev.status === 'FINISHED' ? `Finalizó ${formatDate(ev.endedAt)}` : `Inicio: ${formatDate(ev.startDate)}`}</p>
        </div>
        <div className="hbtns">
          {editable && <a className="btn ghost" href={`#/eventos/${ev.id}/editar`}>Editar</a>}
          {manage && live && <button type="button" className="btn light" onClick={() => setConfirm(true)}>Finalizar evento</button>}
        </div>
      </header>
      <main className="ev-main">
        {error && <p className="notice err" role="alert">{error}</p>}
        <Warnings items={[...ev.warnings, ...finishWarnings, ...(data.monitoring?.messages ?? [])]} />

        {live && data.monitoring && <Live m={data.monitoring} />}
        {live && !data.monitoring && <p className="notice">Por ahora no es posible monitorear el evento: check-in o brigadistas no respondieron.</p>}
        {ev.status === 'FINISHED' && data.evaluation && <Results e={data.evaluation} />}

        <section className="ev-card">
          <h2>Información del evento</h2>
          <dl className="ev-grid2">
            <dt>Descripción</dt><dd>{ev.description || '—'}</dd>
            <dt>Inicio programado</dt><dd>{formatDate(ev.startDate)}</dd>
            <dt>Alcance</dt><dd>{ev.scope.map((s) => scopeLabel(s.id)).join(', ') || 'Pendiente'}</dd>
            <dt>Participantes</dt><dd>{ev.participantRoles.map((r) => ROLE_LABEL[r] ?? r).join(', ') || 'Pendiente'}</dd>
            <dt>Creado</dt><dd>{formatDate(ev.createdAt)} por {ev.createdBy}</dd>
            <dt>Alertas</dt><dd>{ev.alerts.length ? `${ev.alerts.length} asociadas` : 'Ninguna todavía'}</dd>
          </dl>
          {ev.status === 'DRAFT' && <p className="help">Para programarlo, completa la fecha de inicio, el alcance y los participantes.</p>}
        </section>
      </main>

      {confirm && (
        <div className="ev-modal-bg" role="presentation" onClick={() => !finishing && setConfirm(false)}>
          <div className="ev-modal" role="dialog" aria-modal="true" aria-labelledby="fin-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="fin-title">¿Finalizar el evento?</h2>
            <ul>
              <li>Se deshabilitan el check-in y las nuevas solicitudes de ayuda.</li>
              <li>La atención de incidentes queda congelada en su estado actual.</li>
              <li>Se avisa a los participantes que el evento terminó.</li>
            </ul>
            <div className="row2">
              <button type="button" className="btn white" onClick={() => setConfirm(false)} disabled={finishing}>Seguir en vivo</button>
              <button type="button" className="btn red" onClick={finish} disabled={finishing}>{finishing ? 'Finalizando…' : 'Finalizar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
