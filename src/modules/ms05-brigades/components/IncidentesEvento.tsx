import { useEffect, useState } from 'react';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { formatDate, scopeLabelIn } from '../../ms06-drills/utils/labels';
import { brigadesApi } from '../services/brigades';
import { PRIORIDADES } from '../types';
import type { IncidenteResumen, Pagina } from '../types';

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  REPORTADO: { texto: 'Reportado', clase: 'DRAFT' },
  ASIGNADO: { texto: 'Asignado', clase: 'SCHEDULED' },
  EN_ATENCION: { texto: 'En atención', clase: 'IN_PROGRESS' },
  RESUELTO: { texto: 'Resuelto', clase: 'FINISHED' },
  CERRADO: { texto: 'Cerrado', clase: 'FINISHED' },
};

const prioridadTexto = (codigo: string) => PRIORIDADES.find((p) => p.codigo === codigo)?.label ?? codigo;

interface Props {
  session: Session;
  eventoId: string;
  /** brigadista: ve los suyos y atiende los que tiene asignados. monitoreo: el coordinador o el organizador asigna responsables. */
  modo: 'brigadista' | 'monitoreo';
  /**
   * Brigadistas activos con sus zonas vigentes (solo en monitoreo). MS05 solo acepta como responsable a uno
   * asignado a la ubicación de la solicitud en el mismo evento.
   */
  brigadistas?: { id: string; nombre: string; zonas: { eventoId: string; ubicacionId: string }[] }[];
}

/** Estados en los que el coordinador todavía puede asignar o cambiar el responsable. */
const ASIGNABLES = ['REPORTADO', 'ASIGNADO'];

/**
 * Incidentes de un evento, desde MS05 (que filtra según el rol). El brigadista inicia la atención de los que
 * tiene asignados y los marca como resueltos; el coordinador y el organizador los monitorean.
 */
export default function IncidentesEvento({ session, eventoId, modo, brigadistas = [] }: Props) {
  const [data, setData] = useState<Pagina<IncidenteResumen> | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  // Cambia para volver a pedir la página (Reintentar o después de una acción).
  const [version, setVersion] = useState(0);
  const { catalog } = useScopeCatalog();
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let ignore = false;
    brigadesApi.incidentes(session, eventoId, page)
      .then((pagina) => { if (!ignore) { setData(pagina); setError(''); } })
      .catch((err) => { if (!ignore) setError(errorMessage(err)); });
    return () => { ignore = true; };
  }, [session, eventoId, page, version]);

  const actuar = async (incidente: IncidenteResumen, accion: 'iniciar' | 'resolver') => {
    let observaciones = '';
    if (accion === 'resolver') {
      observaciones = window.prompt('¿Cómo se resolvió el incidente? (obligatorio)')?.trim() ?? '';
      if (!observaciones) return;
    }
    setBusy(incidente.incidenteId);
    setNotice('');
    try {
      if (accion === 'iniciar') await brigadesApi.iniciarAtencion(session, eventoId, incidente.incidenteId);
      else await brigadesApi.resolver(session, eventoId, incidente.incidenteId, observaciones);
      setNotice(accion === 'iniciar' ? 'Atención iniciada.' : 'Incidente marcado como resuelto.');
      load();
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const asignar = async (incidente: IncidenteResumen, responsableId: string) => {
    if (!responsableId || responsableId === incidente.brigadistaResponsableId) return;
    setBusy(incidente.incidenteId);
    setNotice('');
    try {
      await brigadesApi.asignarResponsable(session, eventoId, incidente.incidenteId, responsableId);
      setNotice('Responsable asignado.');
      load();
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const propio = (i: IncidenteResumen) => i.brigadistaResponsableId === session.user.id;
  const nombreDe = (id: string) => brigadistas.find((b) => b.id === id)?.nombre;
  const responsable = (i: IncidenteResumen) => {
    if (!i.brigadistaResponsableId) return <span className="help">Sin asignar</span>;
    if (propio(i)) return 'Usted';
    return nombreDe(i.brigadistaResponsableId) ?? 'Asignado';
  };
  const candidatos = (i: IncidenteResumen) =>
    brigadistas.filter((b) => b.zonas.some((z) => z.eventoId === eventoId && z.ubicacionId === i.zonaId));
  const puedeAsignar = modo === 'monitoreo' && brigadistas.length > 0;
  // contenido llega con la paginación estándar de MS05; sin ella (versión anterior del servicio) la lista queda vacía.
  const incidentes = data?.contenido ?? [];

  return (
    <>
      {notice && <p className="notice" role="status">{notice}</p>}
      {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={load}>Reintentar</button></p>}
      {!error && data === null && <p className="notice" role="status">Cargando incidentes…</p>}
      {data && incidentes.length === 0 && (
        <div className="ev-empty">{modo === 'brigadista' ? 'No tiene incidentes en este evento.' : 'No hay incidentes reportados en este evento.'}</div>
      )}
      {incidentes.length > 0 && (
        <table className="ev-table">
          <thead>
            <tr>
              <th>Prioridad</th><th>Estado</th><th>Ubicación</th><th>Reportado</th><th>Responsable</th>
              {(modo === 'brigadista' || puedeAsignar) && <th style={{ textAlign: 'right' }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {incidentes.map((i) => {
              const estado = ESTADOS[i.estado] ?? { texto: i.estado, clase: 'DRAFT' };
              return (
                <tr key={i.incidenteId}>
                  <td><div className="t">{prioridadTexto(i.prioridad)}</div></td>
                  <td><span className={`st ${estado.clase}`}>{estado.texto}</span></td>
                  <td>{scopeLabelIn(i.zonaId, catalog)}</td>
                  <td>{formatDate(i.reportadoEn)}</td>
                  <td>{responsable(i)}</td>
                  {puedeAsignar && (
                    <td>
                      <div className="ev-acts">
                        {!ASIGNABLES.includes(i.estado) ? <span className="help">En curso o cerrada</span>
                          : candidatos(i).length === 0 ? <span className="help">Sin brigadistas en esta ubicación</span> : (
                          <select aria-label="Asignar responsable" value={i.brigadistaResponsableId ?? ''} disabled={busy === i.incidenteId}
                            onChange={(e) => asignar(i, e.target.value)}
                            style={{ font: 'inherit', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}>
                            <option value="" disabled>Asignar brigadista…</option>
                            {i.brigadistaResponsableId && !nombreDe(i.brigadistaResponsableId) && <option value={i.brigadistaResponsableId}>Asignado</option>}
                            {candidatos(i).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                  )}
                  {modo === 'brigadista' && (
                    <td>
                      <div className="ev-acts">
                        {propio(i) && i.estado === 'ASIGNADO' && (
                          <button type="button" className="btn white" disabled={busy === i.incidenteId} onClick={() => actuar(i, 'iniciar')}>Iniciar atención</button>
                        )}
                        {propio(i) && i.estado === 'EN_ATENCION' && (
                          <button type="button" className="btn white" disabled={busy === i.incidenteId} onClick={() => actuar(i, 'resolver')}>Marcar como resuelto</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {data && data.total_paginas > 1 && (
        <div className="ev-pager">
          <span>Página {data.page + 1} de {data.total_paginas} · {data.total_elementos} incidentes</span>
          <div>
            <button type="button" className="ev-tab" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button type="button" className="ev-tab" disabled={page + 1 >= data.total_paginas} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </>
  );
}
