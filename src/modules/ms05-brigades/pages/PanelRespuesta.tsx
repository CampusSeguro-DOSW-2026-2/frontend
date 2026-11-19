import { Fragment, useCallback, useEffect, useState } from 'react';
import { BellIcon, MapLine } from '../../../shared/components/Icons';
import { PERMISSION } from '../../../shared/permissions';
import { errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { getMyProfile } from '../../ms01-identity/services/users';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventSummary } from '../../ms06-drills/types';
import { formatDate, scopeLabelIn } from '../../ms06-drills/utils/labels';
import { brigadesApi } from '../services/brigades';
import type { Asignacion, IncidenteDetalle, IncidenteResumen } from '../types';
import { estadoIncidente, hace, prioridadDe } from '../utils/incidentes';
import '../styles/respuesta.css';

interface GrupoEvento { evento: EventSummary; incidentes: IncidenteResumen[]; error: string }

const PAGE_SIZE = 50;

const Chevron = () => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);
const Search = () => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);

/**
 * Panel de respuesta oficial del brigadista (mockup "Panel brigadista", RF-BEI-06): un desplegable por cada evento en
 * ejecución con los incidentes que MS05 le muestra (los que reportó, los que tiene asignados y los de sus zonas). Al
 * desplegar una fila se ve el detalle y, si el incidente es suyo, «Atender» inicia la atención y abre la pantalla
 * para registrar el resultado.
 */
export default function PanelRespuesta({ session }: { session: Session }) {
  const [grupos, setGrupos] = useState<GrupoEvento[] | null>(null);
  const [detalles, setDetalles] = useState<Record<string, IncidenteDetalle>>({});
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const { catalog } = useScopeCatalog();
  const canRegister = hasPermission(session, PERMISSION.MS05_ASSISTANCE_REGISTER);
  const canAttend = hasPermission(session, PERMISSION.MS05_ASSISTANCE_UPDATE_STATUS);

  const load = useCallback(async () => {
    setError('');
    try {
      const eventos = await eventsApi.active(session);
      const res = await Promise.allSettled(eventos.map((ev) => brigadesApi.incidentes(session, ev.id, 0, PAGE_SIZE)));
      const nuevos = eventos.map((evento, i): GrupoEvento => {
        const r = res[i];
        return r.status === 'fulfilled'
          ? { evento, incidentes: r.value.contenido ?? [], error: '' }
          : { evento, incidentes: [], error: errorMessage(r.reason) };
      });
      setGrupos(nuevos);
      // El listado de MS05 no trae la descripción ni la persona afectada: se completan con el detalle de cada uno
      const todos = nuevos.flatMap((g) => g.incidentes);
      const det = await Promise.allSettled(todos.map((i) => brigadesApi.detalle(session, i.eventoId, i.incidenteId)));
      const mapa: Record<string, IncidenteDetalle> = {};
      det.forEach((d, i) => { if (d.status === 'fulfilled') mapa[todos[i].incidenteId] = d.value; });
      setDetalles(mapa);
    } catch (err) {
      setError(errorMessage(err));
      setGrupos([]);
    }
  }, [session]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    brigadesApi.misAsignaciones(session).then(setAsignaciones).catch(() => { /* sin zona en el encabezado */ });
    getMyProfile(session)
      .then((p) => setNombre([p.firstName, p.firstLastName].filter(Boolean).join(' ')))
      .catch(() => { /* se usa el correo */ });
  }, [session]);

  const ubicacion = (id: string) => scopeLabelIn(id, catalog);
  const reporte = (i: IncidenteResumen) => {
    const d = detalles[i.incidenteId];
    return d?.descripcion || (d?.nombreAfectado ? `${d.nombreAfectado} solicita ayuda` : '—');
  };

  const consulta = busqueda.trim().toLowerCase();
  const filtrar = (list: IncidenteResumen[]) => (!consulta ? list : list.filter((i) => {
    const d = detalles[i.incidenteId];
    return [ubicacion(i.zonaId), reporte(i), d?.nombreAfectado ?? '', prioridadDe(i.prioridad).label, estadoIncidente(i.estado).texto]
      .some((t) => t.toLowerCase().includes(consulta));
  }));

  const todos = grupos?.flatMap((g) => g.incidentes) ?? [];
  const contar = (estado: string) => todos.filter((i) => i.estado === estado).length;
  const zonaActual = asignaciones.find((a) => a.estado === 'VIGENTE' && grupos?.some((g) => g.evento.id === a.eventoId));

  const atender = async (i: IncidenteResumen) => {
    const destino = `#/brigadista/incidentes/${encodeURIComponent(i.eventoId)}/${encodeURIComponent(i.incidenteId)}`;
    if (i.estado !== 'ASIGNADO') { window.location.assign(destino); return; }
    setBusy(i.incidenteId);
    setNotice('');
    try {
      await brigadesApi.iniciarAtencion(session, i.eventoId, i.incidenteId);
      window.location.assign(destino);
    } catch (err) {
      setNotice(errorMessage(err));
      setBusy('');
    }
  };

  const propio = (i: IncidenteResumen) => i.brigadistaResponsableId === session.user.id;
  const responsable = (i: IncidenteResumen) => {
    if (!i.brigadistaResponsableId) return 'Sin asignar';
    return propio(i) ? `${nombre || session.user.email} (tú)` : 'Otro brigadista';
  };

  return (
    <>
      <header className="rs-head">
        <div>
          <span className="badge">ACTIVO</span>
          <h1>Brigadista: {nombre || session.user.email}</h1>
          <p>Panel de Respuesta Oficial</p>
          <div className="rs-stats" aria-label="Resumen de incidentes">
            <span className="rs-stat"><b>{contar('REPORTADO')}</b>Reportadas</span>
            <span className="rs-stat"><b>{contar('ASIGNADO')}</b>Asignadas</span>
            <span className="rs-stat"><b>{contar('EN_ATENCION')}</b>En Atención</span>
          </div>
        </div>
        {zonaActual && <span className="rs-ctx"><MapLine />{ubicacion(zonaActual.ubicacionId)}</span>}
      </header>
      <main className="rs-main">
        <div className="rs-bar">
          <label className="rs-search">
            <Search />
            <input type="search" placeholder="Buscar incidente, zona o responsable…" aria-label="Buscar incidente, zona o responsable"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </label>
          {canRegister && grupos && grupos.length > 0 && (
            <a className="btn red rs-report" href={`#/brigadista/reportar/${encodeURIComponent(grupos[0].evento.id)}`}><BellIcon />Reportar incidente</a>
          )}
        </div>

        {notice && <p className="notice err" role="alert">{notice}</p>}
        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={() => void load()}>Reintentar</button></p>}
        {grupos === null && <p className="notice" role="status">Cargando incidentes…</p>}
        {grupos?.length === 0 && !error && (
          <div className="rs-card rs-empty">
            No hay eventos en ejecución. Si hay uno programado, elige tu edificio en <a className="plink" href="#/brigadista/autoasignacion">Auto asignación</a>.
          </div>
        )}

        {grupos?.map(({ evento, incidentes, error: err }, idx) => {
          const visibles = filtrar(incidentes);
          return (
            <details key={evento.id} className="rs-evento" open={idx === 0 || busqueda.trim() !== ''}>
              <summary>
                <div>
                  <h2>{evento.name}</h2>
                  <small>{evento.simulacro ? 'Simulacro' : 'Emergencia'} · Inició {formatDate(evento.startedAt)} · {incidentes.length} incidente{incidentes.length === 1 ? '' : 's'}</small>
                </div>
                <span className="rs-chev" aria-hidden="true"><Chevron /></span>
              </summary>
              {canRegister && idx > 0 && (
                <div style={{ padding: '0 20px 12px' }}><a className="plink" href={`#/brigadista/reportar/${encodeURIComponent(evento.id)}`}>Reportar incidente en este evento</a></div>
              )}
              {err && <p className="notice err" role="alert" style={{ margin: '0 20px 16px' }}>{err}</p>}
              {!err && visibles.length === 0 && (
                <div className="rs-empty">{busqueda ? 'Ningún incidente coincide con la búsqueda.' : 'No tienes incidentes en este evento.'}</div>
              )}
              {visibles.length > 0 && (
                <table className="rs-table">
                  <thead>
                    <tr><th>Prioridad</th><th>Ubicación</th><th>Reporte</th><th>Estado</th><th style={{ textAlign: 'right' }}>Hace</th></tr>
                  </thead>
                  <tbody>
                    {visibles.map((i) => {
                      const p = prioridadDe(i.prioridad);
                      const st = estadoIncidente(i.estado);
                      const open = abierto === i.incidenteId;
                      const d = detalles[i.incidenteId];
                      const puedeAtender = canAttend && propio(i) && (i.estado === 'ASIGNADO' || i.estado === 'EN_ATENCION');
                      return (
                        <Fragment key={i.incidenteId}>
                          <tr className={`rs-row${open ? ' open' : ''}`} onClick={() => setAbierto(open ? null : i.incidenteId)}>
                            <td><span className={`rs-prio ${p.codigo}${p.codigo === 'EMERGENCIA' ? ' solid' : ''}`}>{p.label}</span></td>
                            <td className="rs-loc">{ubicacion(i.zonaId)}</td>
                            <td className="rs-rep">{reporte(i)}</td>
                            <td><span className={`rs-st ${st.clase}`}>{st.texto}</span></td>
                            <td className="rs-ago">
                              {hace(i.reportadoEn)}
                              <button type="button" className="rs-toggle" aria-expanded={open} aria-label={open ? 'Ocultar detalle' : 'Ver detalle'}
                                onClick={(e) => { e.stopPropagation(); setAbierto(open ? null : i.incidenteId); }}>
                                <span style={{ display: 'inline-flex', transform: open ? 'rotate(180deg)' : undefined }}><Chevron /></span>
                              </button>
                            </td>
                          </tr>
                          {open && (
                            <tr className="rs-detail">
                              <td colSpan={5}>
                                <div className="rs-detail-grid">
                                  <div><small>Prioridad</small><b>{p.label}</b></div>
                                  <div><small>Persona afectada</small><b>{d?.nombreAfectado || '—'}</b></div>
                                  <div><small>Brigadista asignado</small><b>{responsable(i)}</b></div>
                                </div>
                                <div className="rs-detail-acts">
                                  {!puedeAtender && <span className="rs-sub">{propio(i) ? 'Este incidente ya no está en atención.' : 'Solo el brigadista asignado puede atenderlo.'}</span>}
                                  {puedeAtender && (
                                    <button type="button" className="btn red rs-report" disabled={busy === i.incidenteId} onClick={() => void atender(i)}>
                                      ✓ {busy === i.incidenteId ? 'Iniciando…' : 'Atender'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </details>
          );
        })}
      </main>
    </>
  );
}
