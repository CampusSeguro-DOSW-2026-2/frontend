import { useCallback, useEffect, useState } from 'react';
import { PERMISSION } from '../../../shared/permissions';
import { errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { displayName, isTechnicalId } from '../../../shared/utils/text';
import SeguimientoEvento from '../../ms04-evacuation/components/SeguimientoEvento';
import IncidentesEvento from '../../ms05-brigades/components/IncidentesEvento';
import { brigadesApi } from '../../ms05-brigades/services/brigades';
import { checkinApi } from '../../ms04-evacuation/services/checkin';
import { canExecuteEvent, canManageEvent, eventsApi } from '../services/events';
import type { EventDetail as Detail, Evaluation, EventWarning, Monitoring } from '../types';
import { ROLE_LABEL, STATUS_LABEL, formatDate, formatDuration, scopeLabelIn, warningText } from '../utils/labels';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import type { ScopeCatalog } from '../../ms03-alerts/services/catalog';
import '../styles/events.css';

const REFRESH_MS = 15000;
const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(Number(v))}%`);

// "Todavía no hay registros" ya lo dicen las tarjetas; como aviso amarillo solo quedan los problemas reales
const INFO_ONLY = ['NO_CHECKINS', 'NO_INCIDENTS', 'NO_BRIGADIERS', 'NO_RECORDS'];

function Warnings({ items }: { items: EventWarning[] }) {
  const shown = items.filter((w) => !INFO_ONLY.includes(w.code));
  if (!shown.length) return null;
  return <>{shown.map((w) => <div key={w.code + w.message} className="ev-warn" role="status">{warningText(w)}</div>)}</>;
}

/** Convocados y reportados según MS04 (sus resultados traen la población objetivo); null si no se pueden consultar. */
interface Turnout { reported: number; invited: number | null }
const turnoutPct = (t: Turnout | null) => (t?.invited ? (t.reported * 100) / t.invited : null);

/**
 * Participación en el check-in. MS06 la deja vacía porque el consolidado de MS04 no trae la población convocada; en
 * ese caso se calcula con los resultados de MS04 (reportados ÷ convocados). Requiere ms04:history:read.
 */
function useTurnout(session: Session, eventId: string, enabled: boolean, refresh: number): Turnout | null {
  const [turnout, setTurnout] = useState<Turnout | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false;
    checkinApi.resultados(session, eventId)
      .then((r) => { if (!ignore) setTurnout({ reported: r.total_reportados, invited: r.poblacion_objetivo }); })
      .catch(() => { /* sin población: se muestra lo que dé MS06 */ });
    return () => { ignore = true; };
  }, [session, eventId, enabled, refresh]);
  return turnout;
}

function participationText(own: number | null | undefined, t: Turnout | null): { value: number | null; detail: string } {
  const value = own ?? turnoutPct(t);
  return { value: value == null ? null : Number(value), detail: t?.invited ? `${t.reported} de ${t.invited} convocados` : '' };
}

function Live({ m, catalog, turnout }: { m: Monitoring; catalog: ScopeCatalog | null; turnout: Turnout | null }) {
  const c = m.checkIn;
  const i = m.incidents;
  return (
    <>
      <section className="ev-kpis" aria-label="Indicadores en vivo">
        <div className="ev-kpi"><small>Check-ins registrados</small><b>{c?.totalCheckins ?? '—'}</b>
          <div className="ev-bar"><i style={{ width: `${Math.min(100, participationText(c?.participationPct, turnout).value ?? 0)}%` }} /></div>
          <span>Participación {pct(participationText(c?.participationPct, turnout).value)}{turnout?.invited ? ` · ${participationText(c?.participationPct, turnout).detail}` : ''}</span></div>
        <div className="ev-kpi hot"><small>Incidentes pendientes</small><b>{i?.pending ?? '—'}</b><span>{i ? `${i.totalIncidents} en total` : 'Sin datos de incidentes'}</span></div>
        <div className="ev-kpi"><small>Atendidos / resueltos</small><b>{i ? `${i.attended} / ${i.resolved}` : '—'}</b><span>Atención media {formatDuration(i?.avgAttentionSeconds)}</span></div>
        <div className="ev-kpi"><small>Brigadistas activos</small><b>{m.brigadiersByZone.reduce((n, z) => n + z.activeCount, 0)}</b><span>en {m.brigadiersByZone.length} zonas</span></div>
      </section>
      <div>
        <section className="ev-card">
          <h2>Brigadistas por zona</h2>
          {m.brigadiersByZone.length === 0 && <p className="help">Todavía no hay brigadistas asignados.</p>}
          {m.brigadiersByZone.map((z) => (
            <div className="ev-zone" key={z.zoneId}>
              <b>{scopeLabelIn(z.zoneId, catalog)}</b>
              <span>{z.activeCount} activos · {z.brigadiers.map((b) => displayName('Brigadista sin nombre', b.name)).join(', ') || '—'}</span>
            </div>
          ))}
          {m.brigadiersSyncedAt && <span className="help">Actualizado {formatDate(m.brigadiersSyncedAt)}</span>}
        </section>
      </div>
    </>
  );
}

function Results({ e, names, turnout }: { e: Evaluation; names: Record<string, string>; turnout: Turnout | null }) {
  if (e.noRecords) return <p className="notice">Todavía no hay registros de check-in, solicitudes de ayuda ni incidentes para este evento.</p>;
  return (
    <>
      {!e.complete && <div className="ev-warn" role="status">Algunas cifras aún no llegan de check-in o de brigadistas; se completan solas en unos minutos.</div>}
      <section className="ev-kpis" aria-label="Resultados">
        <div className="ev-kpi"><small>Participación en check-in</small><b>{pct(participationText(e.checkinParticipationPct, turnout).value)}</b><span>{participationText(e.checkinParticipationPct, turnout).detail || `${e.totalCheckins ?? '—'} check-ins`}</span></div>
        <div className="ev-kpi"><small>Incidentes</small><b>{e.totalIncidents ?? '—'}</b><span>{e.casesResolved ?? 0} resueltos</span></div>
        <div className="ev-kpi hot"><small>Tiempo medio de atención</small><b>{formatDuration(e.avgAttentionSeconds)}</b><span>{e.casesAttended ?? 0} casos atendidos</span></div>
        <div className="ev-kpi"><small>Brigadistas con casos</small><b>{e.brigadiers.length}</b><span>desempeño abajo</span></div>
      </section>
      <section className="ev-card">
        <h2>Desempeño de la brigada</h2>
        {e.brigadiers.length === 0 && <p className="help">Ningún brigadista atendió casos.</p>}
        {e.brigadiers.map((b, i) => (
          <div className="ev-zone" key={b.brigadierId}><span>{names[b.brigadierId] ?? `Brigadista ${i + 1}`}</span><b>{b.casesAttended} atendidos · {b.casesResolved} resueltos</b></div>
        ))}
      </section>
    </>
  );
}

/**
 * Nombres de los brigadistas del evento (panel de gestión de MS05, para coordinador y organizador). Sin permiso o si
 * MS05 no responde, queda vacío y la pantalla los numera; nunca muestra su id.
 */
function useBrigade(session: Session, eventId: string, enabled: boolean, refresh: number) {
  const [brigade, setBrigade] = useState<{ names: Record<string, string>; active: { id: string; nombre: string; ubicacionId: string | null }[] }>({ names: {}, active: [] });
  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false;
    brigadesApi.gestionEvento(session, eventId)
      .then((g) => {
        if (ignore) return;
        setBrigade({
          names: Object.fromEntries(g.brigadistas.map((b) => [b.brigadistaId, b.nombre])),
          active: g.brigadistas.filter((b) => b.estado === 'ACTIVO').map((b) => ({ id: b.brigadistaId, nombre: b.nombre, ubicacionId: b.ubicacionId })),
        });
      })
      .catch(() => { /* sin nombres */ });
    return () => { ignore = true; };
  }, [session, eventId, enabled, refresh]);
  return brigade;
}

/**
 * Seguimiento del evento en un solo lugar: el estado de cada participante (check-in de MS04) y los incidentes con
 * su responsable (MS05). Lo ven el coordinador y el organizador sin cambiar de pantalla.
 */
function Tracking({ session, id, refresh, names, manage }: {
  session: Session; id: string; refresh: number; names: Record<string, string>;
  /** Brigadistas activos, si la sesión puede asignar responsables y cerrar casos en este tipo de evento. */
  manage?: { brigadistas: { id: string; nombre: string; ubicacionId: string | null }[] };
}) {
  const canTrack = hasPermission(session, PERMISSION.MS04_DASHBOARD_READ);
  const canIncidents = hasPermission(session, PERMISSION.MS05_INCIDENT_READ);
  if (!canTrack && !canIncidents) return null;
  return (
    <>
      {canTrack && (
        <section className="ev-track" aria-labelledby="ev-track-title">
          <h2 id="ev-track-title">Seguimiento de participantes</h2>
          <SeguimientoEvento session={session} eventoId={id} refresco={refresh} />
        </section>
      )}
      {canIncidents && (
        <section className="ev-card">
          <h2>Incidentes</h2>
          <p className="help">Solicitudes de ayuda e incidentes del evento, con su prioridad, estado y brigadista responsable.{manage ? ' Puede asignar el caso a un brigadista del mismo lugar y cerrar los resueltos.' : ''}</p>
          <IncidentesEvento session={session} eventoId={id} modo="monitoreo" nombresBrigadistas={names} refresco={refresh} gestion={manage} />
        </section>
      )}
    </>
  );
}

/** RF-EVE-03 y RF-EVE-04: detalle del evento, monitoreo en vivo, finalizar y resultados. */
export default function EventDetail({ session, id }: { session: Session; id: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const { catalog } = useScopeCatalog();
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
  // En vivo, todo (MS06, el check-in de MS04 y los incidentes de MS05) se vuelve a consultar cada 15 s
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(() => { load(); setTick((n) => n + 1); }, REFRESH_MS);
    return () => clearInterval(t);
  }, [live, load]);
  const finishedOrLive = live || data?.event.status === 'FINISHED';
  const canManageBrigade = hasPermission(session, PERMISSION.MS05_BRIGADIER_ASSIGN_TO_DRILL, PERMISSION.MS05_BRIGADIER_ASSIGN_TO_REAL);
  const brigade = useBrigade(session, id, !!finishedOrLive && canManageBrigade, tick);
  const turnout = useTurnout(session, id, !!finishedOrLive && hasPermission(session, PERMISSION.MS04_HISTORY_READ), tick);
  const brigadierNames = brigade.names;
  // Asignar responsable y cerrar casos: permiso de MS05 según el tipo de evento, y solo mientras está en ejecución
  const canAssist = !!data && live && hasPermission(session, data.event.simulacro
    ? PERMISSION.MS05_ASSISTANCE_ASSIGN_TO_DRILL : PERMISSION.MS05_ASSISTANCE_ASSIGN_TO_REAL);

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
  const editable = canManageEvent(session, ev.simulacro) && ev.status !== 'FINISHED';
  const canFinish = canExecuteEvent(session, ev.simulacro);

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
          {canFinish && live && <button type="button" className="btn light" onClick={() => setConfirm(true)}>Finalizar evento</button>}
        </div>
      </header>
      <main className="ev-main">
        {error && <p className="notice err" role="alert">{error}</p>}
        <Warnings items={[...ev.warnings, ...finishWarnings, ...(data.monitoring?.messages ?? [])]} />

        {live && data.monitoring && <Live m={data.monitoring} catalog={catalog} turnout={turnout} />}
        {live && !data.monitoring && <p className="notice">Por ahora no se pueden mostrar los indicadores en vivo. El seguimiento de abajo sigue disponible.</p>}
        {live && <p className="help">La información se actualiza sola cada {REFRESH_MS / 1000} segundos.</p>}
        {ev.status === 'FINISHED' && data.evaluation && <Results e={data.evaluation} names={brigadierNames} turnout={turnout} />}
        {finishedOrLive && <Tracking session={session} id={id} refresh={tick} names={brigadierNames}
          manage={canAssist ? { brigadistas: brigade.active } : undefined} />}

        <section className="ev-card">
          <h2>Información del evento</h2>
          <dl className="ev-grid2">
            <dt>Descripción</dt><dd>{ev.description || '—'}</dd>
            <dt>Inicio programado</dt><dd>{formatDate(ev.startDate)}</dd>
            <dt>Alcance</dt><dd>{ev.scope.map((s) => scopeLabelIn(s.id, catalog)).join(', ') || 'Pendiente'}</dd>
            <dt>Participantes</dt><dd>{ev.participantRoles.map((r) => ROLE_LABEL[r] ?? r).join(', ') || 'Pendiente'}</dd>
            <dt>Creado</dt><dd>{formatDate(ev.createdAt)}{ev.createdBy && !isTechnicalId(ev.createdBy) ? ` por ${ev.createdBy}` : ''}</dd>
            <dt>Alertas</dt><dd>{ev.alerts.length ? `${ev.alerts.length} asociadas` : 'Ninguna todavía'}</dd>
          </dl>
          {ev.status === 'DRAFT' && <p className="help">Para programarlo, complete la fecha de inicio, el alcance y los participantes.</p>}
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
