import { API_URL, ApiError, NETWORK_ERROR, request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type {
  ActivacionResponse, Asignacion, BusquedaBrigadistas, EstadoBrigadista, Evidencia, Incidente, NuevoIncidente, TipoUbicacion,
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
    request(`/api/v1/eventos/${enc(eventoId)}/incidentes`, {
      method: 'POST', session, body,
      fields: { prioridadId: 'prioridad', ubicacionId: 'ubicacion', tipoUbicacion: 'ubicacion', descripcion: 'descripcion', nombreAfectado: 'nombreAfectado' },
    }) as Promise<Incidente>,

  /** Sube una evidencia (multipart). Se hace fuera de request() porque ese cliente solo envía JSON. */
  async subirEvidencia(session: Session, eventoId: string, incidenteId: string, archivo: File): Promise<Evidencia> {
    const form = new FormData();
    form.append('archivo', archivo);
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/v1/eventos/${enc(eventoId)}/incidentes/${enc(incidenteId)}/evidencias`, {
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
