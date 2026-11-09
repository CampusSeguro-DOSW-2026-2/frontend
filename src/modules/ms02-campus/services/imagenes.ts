import { API_URL, NETWORK_ERROR } from '../../../shared/services/http';
import { getSession } from '../../../shared/services/session';

const BASE = '/api/v1/images';

export type TipoElementoImagen = 'EDIFICIO' | 'ESPACIO' | 'SALIDA' | 'ZONA_SEGURA';

export interface ImagenCampus {
  id: string;
  tipoElemento: TipoElementoImagen;
  elementoId: string;
  nombreOriginal: string;
  tipoContenido: string;
  tamanioBytes: number;
  createdAt: string;
}

/** fetch que convierte el fallo de red del navegador ("Failed to fetch") en un mensaje legible. */
async function llamar(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(NETWORK_ERROR);
  }
}

function encabezados(): Record<string, string> {
  const session = getSession();
  const headers: Record<string, string> = {
    'X-Correlation-ID': crypto.randomUUID(),
  };
  if (session) headers.Authorization = `Bearer ${session.token}`;
  return headers;
}

async function comprobarRespuesta(respuesta: Response): Promise<void> {
  if (respuesta.ok) return;

  const cuerpo = await respuesta.json().catch(() => ({})) as {
    mensaje?: string;
    message?: string;
  };

  if (respuesta.status === 401) {
    throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
  }
  if (respuesta.status === 403) {
    throw new Error('No tienes permisos para gestionar las imágenes de este elemento.');
  }
  throw new Error(cuerpo.mensaje || cuerpo.message || `Error al gestionar imágenes (${respuesta.status}).`);
}

export const imagenesApi = {
  async listar(tipoElemento: TipoElementoImagen, elementoId: string): Promise<ImagenCampus[]> {
    const params = new URLSearchParams({ tipoElemento, elementoId });
    const respuesta = await llamar(`${API_URL}${BASE}?${params}`, {
      headers: { ...encabezados(), Accept: 'application/json' },
    });
    await comprobarRespuesta(respuesta);
    return respuesta.json() as Promise<ImagenCampus[]>;
  },

  async obtenerArchivo(id: string): Promise<Blob> {
    const respuesta = await llamar(`${API_URL}${BASE}/${encodeURIComponent(id)}`, {
      headers: { ...encabezados(), Accept: 'image/*' },
    });
    await comprobarRespuesta(respuesta);
    return respuesta.blob();
  },

  async subir(tipoElemento: TipoElementoImagen, elementoId: string, archivo: File): Promise<ImagenCampus> {
    const datos = new FormData();
    datos.append('tipoElemento', tipoElemento);
    datos.append('elementoId', elementoId);
    datos.append('archivo', archivo);

    const respuesta = await llamar(`${API_URL}${BASE}`, {
      method: 'POST',
      headers: encabezados(),
      body: datos,
    });
    await comprobarRespuesta(respuesta);
    return respuesta.json() as Promise<ImagenCampus>;
  },

  async eliminar(id: string): Promise<void> {
    const respuesta = await llamar(`${API_URL}${BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: encabezados(),
    });
    await comprobarRespuesta(respuesta);
  },
};