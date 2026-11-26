import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { confirmar } from '../../../shared/services/feedback';
import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { useEffect, useState } from 'react';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { formatDate, scopeLabelIn } from '../../ms06-drills/utils/labels';
import { brigadesApi } from '../services/brigades';
import type { IncidenteResumen, Pagina } from '../types';
import PrioridadChip from './PrioridadChip';

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  REPORTADO: { texto: 'Reportado', clase: 'DRAFT' },
  ASIGNADO: { texto: 'Asignado', clase: 'SCHEDULED' },
  EN_ATENCION: { texto: 'En atención', clase: 'IN_PROGRESS' },
  RESUELTO: { texto: 'Resuelto', clase: 'FINISHED' },
  CERRADO: { texto: 'Cerrado', clase: 'FINISHED' },
};

interface Props {
  session: Session;
  eventoId: string;
  /** brigadista: ve los suyos y atiende los que tiene asignados. monitoreo: solo lectura (coordinador u organizador). */
  modo: 'brigadista' | 'monitoreo';
  /** Nombre de cada brigadista por id (panel de gestión de MS05), para mostrar al responsable por su nombre. */
  nombresBrigadistas?: Record<string, string>;
  /** Cambia para volver a pedir la página sin perder la posición (monitoreo en vivo). */
  refresco?: number;
  /**
   * Monitoreo con gestión (coordinador u organizador con ms05:assistance:assign_*): brigadistas activos del evento con
   * su edificio, para asignar responsable (MS05 solo acepta a uno asignado en el lugar del incidente), y cerrar casos.
   */
  gestion?: { brigadistas: { id: string; nombre: string; ubicacionId: string | null }[] };
}

/**
 * Incidentes de un evento, desde MS05 (que filtra según el rol). El brigadista inicia la atención de los que
 * tiene asignados y los marca como resueltos; el coordinador y el organizador los monitorean.
 */
export default function IncidentesEvento({ session, eventoId, modo, nombresBrigadistas = {}, refresco = 0, gestion }: Props) {
  const [asignando, setAsignando] = useState<string | null>(null);
  const [elegido, setElegido] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [fallo, setFallo] = useState('');
  const [data, setData] = useState<Pagina<IncidenteResumen> | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  // Cambia para volver a pedir la página (Reintentar).
  const [version, setVersion] = useState(0);
  const { catalog } = useScopeCatalog();
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let ignore = false;
    brigadesApi.incidentes(session, eventoId, page)
      .then((pagina) => { if (!ignore) { setData(pagina); setError(''); } })
      .catch((err) => { if (!ignore) setError(errorMessage(err)); });
    return () => { ignore = true; };
  }, [session, eventoId, page, version, refresco]);

  const propio = (i: IncidenteResumen) => i.brigadistaResponsableId === session.user.id;

  const ejecutar = async (accion: () => Promise<unknown>, exito: string) => {
    setOcupado(true);
    setAviso('');
    setFallo('');
    try {
      await accion();
      setAviso(exito);
      setAsignando(null);
      load();
    } catch (err) {
      setFallo(errorMessage(err));
    } finally {
      setOcupado(false);
    }
  };
  // contenido llega con la paginación estándar de MS05; sin ella (versión anterior del servicio) la lista queda vacía.
  const incidentes = data?.contenido ?? [];

  return (
    <>
      {error && <Mensaje tono="error" onReintentar={load}>{error}</Mensaje>}
      {!error && data === null && <Cargando texto="Cargando incidentes…" />}
      {aviso && <Mensaje tono="exito">{aviso}</Mensaje>}
      {fallo && <Mensaje tono="error">{fallo}</Mensaje>}
      {data && incidentes.length === 0 && (
        <EstadoVacio titulo={modo === 'brigadista' ? 'No tiene incidentes en este evento' : 'No hay incidentes reportados en este evento'} />
      )}
      {incidentes.length > 0 && (
        <table className="ev-table inc-tabla">
          <thead>
            <tr>
              <th>Prioridad</th><th>Estado</th><th>Ubicación</th><th>Reportado</th><th>Responsable</th>
              {(modo === 'brigadista' || gestion) && <th style={{ textAlign: 'right' }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {incidentes.map((i) => {
              const estado = ESTADOS[i.estado] ?? { texto: i.estado, clase: 'DRAFT' };
              return (
                <tr key={i.incidenteId}>
                  <td className="inc-prio"><PrioridadChip codigo={i.prioridad} /></td>
                  <td><span className={`st ${estado.clase}`}>{estado.texto}</span></td>
                  <td className="inc-lugar"><div className="t">{scopeLabelIn(i.zonaId, catalog)}</div></td>
                  <td>{formatDate(i.reportadoEn)}</td>
                  <td>{i.brigadistaResponsableId
                    ? (propio(i) ? 'Usted' : nombresBrigadistas[i.brigadistaResponsableId] ?? 'Otro brigadista')
                    : <span className="help">Sin asignar</span>}</td>
                  {modo === 'brigadista' && (
                    <td className="inc-acts">
                      <div className="ev-acts">
                        {propio(i) && (i.estado === 'ASIGNADO' || i.estado === 'EN_ATENCION') && (
                          <a className={`btn ${i.estado === 'ASIGNADO' ? 'red' : 'white'}`} href={`#/brigadista/incidentes/${encodeURIComponent(eventoId)}/${encodeURIComponent(i.incidenteId)}`}>
                            {i.estado === 'ASIGNADO' ? 'Atender' : 'Continuar atención'}
                          </a>
                        )}
                      </div>
                    </td>
                  )}
                  {gestion && modo === 'monitoreo' && (
                    <td className="inc-acts">
                      <div className="ev-acts">
                        {asignando === i.incidenteId ? (
                          <>
                            <select aria-label="Brigadista responsable" value={elegido} onChange={(e) => setElegido(e.target.value)} disabled={ocupado}>
                              <option value="">Elija un brigadista</option>
                              {gestion.brigadistas.filter((b) => b.id !== i.brigadistaResponsableId && b.ubicacionId === i.zonaId).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                            </select>
                            <button type="button" className="btn white" disabled={!elegido || ocupado}
                              onClick={() => void ejecutar(() => brigadesApi.asignarResponsable(session, eventoId, i.incidenteId, elegido),
                                `El caso quedó a cargo de ${gestion.brigadistas.find((b) => b.id === elegido)?.nombre ?? 'el brigadista elegido'}.`)}>Guardar</button>
                            <button type="button" className="btn white" disabled={ocupado} onClick={() => setAsignando(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            {['REPORTADO', 'ASIGNADO', 'EN_ATENCION'].includes(i.estado) && (
                              <button type="button" className="btn white"
                                disabled={ocupado || !gestion.brigadistas.some((b) => b.id !== i.brigadistaResponsableId && b.ubicacionId === i.zonaId)}
                                title={gestion.brigadistas.some((b) => b.id !== i.brigadistaResponsableId && b.ubicacionId === i.zonaId)
                                  ? undefined : 'Ningún otro brigadista activo está asignado a este lugar'}
                                onClick={() => { setAsignando(i.incidenteId); setElegido(''); setAviso(''); }}>
                                {i.brigadistaResponsableId ? 'Reasignar' : 'Asignar'}
                              </button>
                            )}
                            {i.estado === 'RESUELTO' && (
                              <button type="button" className="btn white" disabled={ocupado}
                                onClick={async () => {
                                  if (await confirmar({ titulo: '¿Cerrar este caso?', texto: 'Ya no se podrá modificar.', accion: 'Cerrar caso', peligro: true })) void ejecutar(() => brigadesApi.cerrarIncidente(session, eventoId, i.incidenteId), 'El caso quedó cerrado.'); }}>
                                Cerrar caso
                              </button>
                            )}
                          </>
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
