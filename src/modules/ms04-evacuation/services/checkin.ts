import { ApiError, request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type { Checkin, CheckinRequest, Evento } from '../types';

/**
 * Cliente de MS04 (Evacuación y check-in). Todo pasa por el API Gateway con el JWT de la sesión: el Gateway agrega
 * X-User-Id y X-User-Role, y MS04 identifica al usuario solo por ellos (RN-MS04-06). MS04 responde los errores
 * con el ErrorResponse de los Estándares y los mensajes ya en español, así que se muestran tal cual.
 */
const BASE = '/api/v1/chi/eventos';
const enc = encodeURIComponent;

/** Mensaje de MS04 (404) cuando el usuario todavía no ha reportado en el evento (RF-MS04-05). */
export const SIN_CHECKIN = 'No tiene check-in en este evento.';

/** Campo del contrato → campo del formulario F-01, para marcar los errores 400 por campo. */
const CAMPOS: Record<string, string> = {
  estado: 'estado',
  punto_encuentro_id: 'punto',
  ubicacion: 'ubicacion',
  'ubicacion.tipo': 'ubicacion',
  'ubicacion.id': 'ubicacion',
};

export const checkinApi = {
  /**
   * Eventos en ejecución cuyos roles convocados incluyen alguno de los del usuario, ordenados por fecha de inicio
   * (RF-MS04-01). Sin eventos que le apliquen, la lista viene vacía.
   */
  async eventosActivos(session: Session): Promise<Evento[]> {
    const data = await request(`${BASE}/activos`, { session });
    return Array.isArray(data) ? (data as Evento[]) : [];
  },

  /**
   * Registra el check-in o actualiza el estado vigente (RF-MS04-02, RF-MS04-03). MS04 responde 201 con el primero,
   * 200 con un cambio, y 200 con el vigente si el reporte lo repite.
   */
  async reportar(session: Session, eventoId: string, cuerpo: CheckinRequest): Promise<Checkin> {
    return (await request(`${BASE}/${enc(eventoId)}/checkins`, {
      method: 'POST', body: cuerpo, session, fields: CAMPOS,
    })) as Checkin;
  },

  /** Estado vigente del usuario en el evento (RF-MS04-05), o null si todavía no ha reportado. */
  async estadoVigente(session: Session, eventoId: string): Promise<Checkin | null> {
    try {
      return (await request(`${BASE}/${enc(eventoId)}/checkins/propio`, { session })) as Checkin;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && err.message === SIN_CHECKIN) return null;
      throw err;
    }
  },
};
