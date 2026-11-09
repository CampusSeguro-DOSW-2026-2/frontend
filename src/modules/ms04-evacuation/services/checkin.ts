import { request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type { Evento } from '../types';

/**
 * Cliente de MS04 (Evacuación y check-in). Todo pasa por el API Gateway con el JWT de la sesión: el Gateway agrega
 * X-User-Id y X-User-Role, y MS04 identifica al usuario solo por ellos (RN-MS04-06). MS04 responde los errores
 * con el ErrorResponse de los Estándares y los mensajes ya en español, así que se muestran tal cual.
 */
const BASE = '/api/v1/chi/eventos';

export const checkinApi = {
  /**
   * Eventos en ejecución cuyos roles convocados incluyen alguno de los del usuario, ordenados por fecha de inicio
   * (RF-MS04-01). Sin eventos que le apliquen, la lista viene vacía.
   */
  async eventosActivos(session: Session): Promise<Evento[]> {
    const data = await request(`${BASE}/activos`, { session });
    return Array.isArray(data) ? (data as Evento[]) : [];
  },
};
