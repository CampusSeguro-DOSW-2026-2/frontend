import { request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type { Edificio, PuntoEncuentro } from '../types';

/**
 * Consultas de solo lectura a MS02 (Campus) que necesita el reporte de estado: MS02 es dueño de los puntos de
 * encuentro y MS04 solo guarda su id (RN-MS04-02). Pasan por el API Gateway con el JWT de la sesión; todos los roles
 * tienen ms02:campus:read.
 */
export const campusApi = {
  /**
   * Puntos de encuentro (zonas seguras) para Estoy a salvo, ordenados por nombre. Solo los ACTIVO: MS04 rechaza un
   * punto inactivo (RN-MS04-04) y el contrato de MS02 no indica si la lista los excluye.
   */
  async puntosEncuentro(session: Session): Promise<PuntoEncuentro[]> {
    const data = await request('/api/v1/safe-zones', { session });
    const puntos = Array.isArray(data) ? (data as PuntoEncuentro[]) : [];
    return puntos
      .filter((p) => p.estado === 'ACTIVO')
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },

  /**
   * Edificios de MS02 para Requiero asistencia (RN-MS04-09), ordenados por nombre. `GET /buildings` solo devuelve los
   * activos.
   */
  async edificios(session: Session): Promise<Edificio[]> {
    const data = await request('/api/v1/buildings', { session });
    const edificios = Array.isArray(data) ? (data as Edificio[]) : [];
    return [...edificios].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  },
};
