import { request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type { Edificio, Espacio, PuntoEncuentro, Ubicacion } from '../types';

/**
 * Consultas de solo lectura a MS02 (Campus) que necesita el reporte de estado: MS02 es dueño de los edificios,
 * espacios y puntos de encuentro, y MS04 solo guarda sus ids (RN-MS04-02). Pasan por el API Gateway con el JWT de la
 * sesión; todos los roles tienen ms02:campus:read. Las listas de MS02 traen por defecto solo lo ACTIVO; igual se
 * filtra aquí, porque MS04 rechaza un punto de encuentro inactivo (RN-MS04-04).
 */
const enc = encodeURIComponent;

const activos = <T extends { estado: string; nombre: string }>(data: unknown): T[] =>
  (Array.isArray(data) ? (data as T[]) : [])
    .filter((e) => e.estado === 'ACTIVO')
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

export const campusApi = {
  /**
   * Puntos de encuentro para Estoy a salvo y para Requiero asistencia, ordenados por nombre. En MS02 no toda zona
   * segura es punto de encuentro: se piden solo las marcadas (puntoEncuentro=true).
   */
  async puntosEncuentro(session: Session): Promise<PuntoEncuentro[]> {
    const data = await request('/api/v1/safe-zones?puntoEncuentro=true', { session });
    return activos<PuntoEncuentro>(data).filter((p) => p.puntoEncuentro !== false);
  },

  /** Edificios activos, ordenados por nombre (ubicación EDIFICIO de Requiero asistencia). */
  async edificios(session: Session): Promise<Edificio[]> {
    return activos<Edificio>(await request('/api/v1/buildings', { session }));
  },

  /** Espacios activos de un edificio, ordenados por nombre (ubicación ESPACIO de Requiero asistencia). */
  async espacios(session: Session, edificioId: string): Promise<Espacio[]> {
    return activos<Espacio>(await request(`/api/v1/buildings/${enc(edificioId)}/spaces`, { session }));
  },

  /**
   * Nombre legible de una ubicación guardada en un check-in, para mostrar el estado vigente. Si MS02 no responde,
   * devuelve vacío y la pantalla muestra solo el estado.
   */
  async nombreUbicacion(session: Session, ubicacion: Ubicacion): Promise<string> {
    try {
      if (ubicacion.tipo === 'EDIFICIO') {
        const edificio = (await request(`/api/v1/buildings/${enc(ubicacion.id)}`, { session })) as Edificio;
        return edificio.nombre;
      }
      if (ubicacion.tipo === 'ESPACIO') {
        const espacio = (await request(`/api/v1/spaces/${enc(ubicacion.id)}`, { session })) as Espacio;
        return espacio.edificioNombre ? `${espacio.nombre} (${espacio.edificioNombre})` : espacio.nombre;
      }
      const punto = (await request(`/api/v1/safe-zones/${enc(ubicacion.id)}`, { session })) as PuntoEncuentro;
      return punto.nombre;
    } catch {
      return '';
    }
  },
};
