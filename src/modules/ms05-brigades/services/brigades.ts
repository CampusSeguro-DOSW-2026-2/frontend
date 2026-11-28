import { API_URL, ApiError, NETWORK_ERROR, request, userText } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type {
  ActivacionResponse, Asignacion, Autoasignacion, AutoasignacionEvento, BrigadistaGestion, BusquedaBrigadistas, EstadoBrigadista,
  EventoOperacion, Evidencia, GestionBrigadistasEvento, Incidente, IncidenteDetalle, IncidenteResumen, NuevoIncidente, Pagina, TipoUbicacion,
} from '../types';

/**
 * Cliente de MS05 (Brigadistas e incidentes). Pasa por el API Gateway: el Gateway agrega X-User-Id,
 * X-User-Role y X-User-Permission a partir del JWT (MS05 autoriza con X-User-Permission); el navegador solo envía el token.
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

  /** Eventos programados o en ejecución con sus edificios (coordinador u organizador). */
  eventosOperacion: (session: Session) =>
    request('/api/v1/brigadistas/eventos', { session }) as Promise<EventoOperacion[]>,

  /** Panel de gestión: brigadistas activos por edificio y luego inactivos, con sus incidentes en el evento. */
  gestionEvento: (session: Session, eventoId: string) =>
    request(`/api/v1/brigadistas/eventos/${enc(eventoId)}/gestion`, { session }) as Promise<GestionBrigadistasEvento>,

  /** El coordinador cambia el edificio de un brigadista (solo eventos reales). */
  cambiarEdificio: (session: Session, eventoId: string, brigadistaId: string, ubicacionId: string) =>
    request(`/api/v1/brigadistas/eventos/${enc(eventoId)}/brigadistas/${enc(brigadistaId)}/asignacion`, {
      method: 'PUT', session, body: { ubicacionId },
    }) as Promise<BrigadistaGestion>,

  /** Auto asignación: estado del brigadista autenticado y eventos donde puede elegir edificio. */
  autoasignacion: (session: Session) =>
    request('/api/v1/brigadistas/autoasignacion', { session }) as Promise<Autoasignacion>,

  /** El brigadista elige o cambia su edificio en el evento. */
  elegirEdificio: (session: Session, eventoId: string, ubicacionId: string) =>
    request(`/api/v1/brigadistas/autoasignacion/eventos/${enc(eventoId)}`, {
      method: 'PUT', session, body: { ubicacionId },
    }) as Promise<AutoasignacionEvento>,

  /** El brigadista quita su asignación (no se permite si es el único en el edificio). */
  quitarEdificio: (session: Session, eventoId: string) =>
    request(`/api/v1/brigadistas/autoasignacion/eventos/${enc(eventoId)}`, { method: 'DELETE', session }) as Promise<AutoasignacionEvento>,

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

  /** La coordinación asigna o cambia el brigadista responsable de un incidente que no está resuelto ni cerrado. */
  asignarResponsable: (session: Session, eventoId: string, incidenteId: string, responsableId: string) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/${enc(incidenteId)}/responsable`, {
      method: 'PATCH', session, body: { responsableId },
    }),

  /** La coordinación cierra un incidente ya resuelto. */
  cerrarIncidente: (session: Session, eventoId: string, incidenteId: string) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/${enc(incidenteId)}/cerrar`, { method: 'POST', session }),

  /**
   * Completa una solicitud propia (PUT): la prioridad y la descripción de la solicitud que MS04 creó desde el check-in
   * «Requiero asistencia». Los campos que no se envían quedan igual.
   */
  completarIncidente: (session: Session, eventoId: string, incidenteId: string, body: { prioridadId?: number; descripcion?: string }) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/${enc(incidenteId)}`, {
      method: 'PUT', session, body, fields: { prioridadId: 'prioridad', descripcion: 'descripcion' },
    }) as Promise<Incidente>,

  /**
   * Incidentes del evento según el rol (MS05 filtra): el coordinador, el organizador y el auditor ven todos;
   * el brigadista, los que reportó, los que tiene asignados y los de sus zonas.
   */
  incidentes: (session: Session, eventoId: string, page = 0, size = 20) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/consulta?page=${page}&size=${size}`, { session }) as Promise<Pagina<IncidenteResumen>>,

  /** Incidentes que reportó el usuario en el evento ("Mis incidentes", ms05:incident:manage_own). */
  misIncidentes: (session: Session, eventoId: string, page = 0, size = 20) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/consulta?soloPropios=true&page=${page}&size=${size}`, { session }) as Promise<Pagina<IncidenteResumen>>,

  /** Detalle de un incidente con su descripción, la persona afectada y las evidencias (ms05:incident:read). */
  detalle: (session: Session, eventoId: string, incidenteId: string) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/${enc(incidenteId)}`, { session }) as Promise<IncidenteDetalle>,

  /** El brigadista responsable inicia la atención de un incidente ASIGNADO. */
  iniciarAtencion: (session: Session, eventoId: string, incidenteId: string) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/${enc(incidenteId)}/iniciar-atencion`, { method: 'POST', session }),

  /** El brigadista responsable finaliza la atención con el resultado y las observaciones. */
  resolver: (session: Session, eventoId: string, incidenteId: string, observaciones: string, resultado: string) =>
    request(`/api/v1/incidentes/eventos/${enc(eventoId)}/${enc(incidenteId)}/resolver`, {
      method: 'POST', session, body: { observaciones, resultado }, fields: { observaciones: 'observaciones' },
    }),

  /**
   * Descarga el archivo de una evidencia con el token de la sesión y devuelve una URL temporal para verlo.
   * Se hace fuera de request() porque ese cliente solo envía JSON.
   */
  async abrirEvidencia(session: Session, eventoId: string, incidenteId: string, evidenciaId: string): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/v1/incidentes/eventos/${enc(eventoId)}/${enc(incidenteId)}/evidencias/${enc(evidenciaId)}/archivo`, {
        headers: { Accept: '*/*', Authorization: `Bearer ${session.token}`, 'X-Correlation-ID': crypto.randomUUID() },
      });
    } catch {
      throw new ApiError(0, NETWORK_ERROR);
    }
    if (!res.ok) {
      throw new ApiError(res.status, `No se pudo abrir la evidencia (HTTP ${res.status}).`);
    }
    return URL.createObjectURL(await res.blob());
  },

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
      throw new ApiError(res.status, userText(data?.mensaje ?? '') || `No se pudo subir "${archivo.name}".`);
    }
    return data as unknown as Evidencia;
  },
};
