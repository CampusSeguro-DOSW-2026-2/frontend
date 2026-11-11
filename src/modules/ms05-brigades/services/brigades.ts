import { API_URL, ApiError, NETWORK_ERROR, request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type {
  ActivacionResponse, Asignacion, BusquedaBrigadistas, EstadoBrigadista, Evidencia, Incidente, IncidenteResumen, NuevoIncidente, Pagina,
  TipoUbicacion,
} from '../types';

/**
 * Cliente de MS05 (Brigadistas e incidentes). Pasa por el API Gateway: el Gateway agrega X-User-Id y
 * X-User-Role a partir del JWT; el navegador solo envía el token.
 */
const enc = encodeURIComponent;

export const EVIDENCE_TYPES = ['image/png', 'application/pdf', 'video/mp4'];
export const MAX_EVIDENCES = 5;

/** El alcance de MS06 usa BUILDING/ZONE; MS05 los llama EDIFICIO/ZONA_SEGURA. */
export const tipoDesdeAlcance = (type: 'BUILDING' | 'ZONE'): TipoUbicacion => (type === 'ZONE' ? 'ZONA_SEGURA' : 'EDIFICIO');

export const brigadesApi = {
  cambiarEstado: (session: Session, estado: EstadoBrigadista) =>
    request(`/api/v1/brigadistas/${enc(session.user.id)}/estado`, { method: 'PUT', body: { estado }, session }) as Promise<ActivacionResponse>,

  misAsignaciones: (session: Session) =>
    request(`/api/v1/asignaciones/brigadista/${enc(session.user.id)}`, { session }) as Promise<Asignacion[]>,

  autoasignarse: (session: Session, eventoId: string, ubicacionId: string, tipoUbicacion: TipoUbicacion) =>
    request('/api/v1/asignaciones/mis-asignaciones', {
      method: 'POST', session,
      // MS05 toma el brigadista del usuario autenticado; el campo se envía porque el contrato lo valida
      body: { brigadistaId: session.user.id, eventoId, ubicacionId, tipoUbicacion },
    }) as Promise<Asignacion>,

  asignacionesDelEvento: (session: Session, eventoId: string) =>
    request(`/api/v1/asignaciones/evento/${enc(eventoId)}`, { session }) as Promise<Asignacion[]>,

  buscar: (session: Session, nombre: string) =>
    request(`/api/v1/brigadistas/buscar?nombreBrigadista=${enc(nombre)}`, { session }) as Promise<BusquedaBrigadistas>,

  reasignar: (session: Session, idAsignacion: string, ubicacionId: string, tipoUbicacion: TipoUbicacion) =>
    request(`/api/v1/asignaciones/${enc(idAsignacion)}`, { method: 'PUT', session, body: { ubicacionId, tipoUbicacion } }) as Promise<Asignacion>,

  retirar: (session: Session, idAsignacion: string) =>
    request(`/api/v1/asignaciones/${enc(idAsignacion)}/retiro`, { method: 'PATCH', session }) as Promise<Asignacion>,

  registrarIncidente: (session: Session, eventoId: string, body: NuevoIncidente) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}`, {
      method: 'POST', session, body,
      fields: { prioridadId: 'prioridad', ubicacionId: 'ubicacion', tipoUbicacion: 'ubicacion', descripcion: 'descripcion', nombreAfectado: 'nombreAfectado' },
    }) as Promise<Incidente>,

  /**
   * Incidentes del evento según el rol (MS05 filtra): el coordinador, el organizador y el auditor ven todos;
   * el brigadista, los que reportó, los que tiene asignados y los de sus zonas.
   */
  incidentes: (session: Session, eventoId: string, page = 0, size = 20) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/consulta?page=${page}&size=${size}`, { session }) as Promise<Pagina<IncidenteResumen>>,

  /** El brigadista responsable inicia la atención de un incidente ASIGNADO. */
  iniciarAtencion: (session: Session, eventoId: string, incidenteId: string) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/${enc(incidenteId)}/iniciar-atencion`, { method: 'POST', session }),

  /** El brigadista responsable marca como resuelto un incidente EN_ATENCION. */
  resolver: (session: Session, eventoId: string, incidenteId: string, observaciones: string) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/${enc(incidenteId)}/resolver`, {
      method: 'POST', session, body: { observaciones },
    }),

  /** Sube una evidencia (multipart). Se hace fuera de request() porque ese cliente solo envía JSON. */
  async subirEvidencia(session: Session, eventoId: string, incidenteId: string, archivo: File): Promise<Evidencia> {
    const form = new FormData();
    form.append('archivo', archivo);
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/v1/incidentes/eventos/${enc(eventoId)}/${enc(incidenteId)}/evidencias`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${session.token}`, 'X-Correlation-ID': crypto.randomUUID() },
        body: form,
      });
    } catch {
      throw new ApiError(0, NETWORK_ERROR);
    }
    const data = await res.json().catch(() => null) as { mensaje?: string } | null;
    if (!res.ok) {
      throw new ApiError(res.status, data?.mensaje || `No se pudo subir "${archivo.name}".`);
    }
    return data as unknown as Evidencia;
  },
};
