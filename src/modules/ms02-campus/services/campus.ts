import type {
  CampusRequest, ZonaAbiertaRequest, CalcularRutaExteriorRequest, ResumenGeneracionRutas, RutaExterior, Campus, ZonaAbierta, ActualizarRutaRequest, CambiarEstadoRequest, CrearRutaRequest, Edificio, EdificioRequest, Espacio,
  EspacioRequest, ModificarEdificioRequest, ModificarEspacioRequest, ModificarSalidaRequest, ModificarZonaSeguraRequest,
  Piso, PisoRequest, RecomendacionPreventiva, RecomendacionPreventivaRequest, Ruta, RutaConsultada, Salida,
  SalidaRequest, TipoEspacio, ZonaSegura, ZonaSeguraRequest, EspacioPublico, SalidaPublica, ZonaSeguraPublica, Escalera, EscaleraRequest, CambiarDisponibilidadEscaleraRequest,
} from '../types';
import { API_URL, ApiError, GENERIC_ERROR, NETWORK_ERROR, request } from '../../../shared/services/http';
import { getSession } from '../../../shared/services/session';

const BASE = '/api/v1';

export class CampusApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly campos: Record<string, string>;
  readonly correlationId: string;

  constructor(status: number, codigo: string, mensaje: string, campos: Record<string, string>, correlationId: string) {
    super(mensaje);
    this.name = 'CampusApiError';
    this.status = status;
    this.codigo = codigo;
    this.campos = campos;
    this.correlationId = correlationId;
  }
}

export const comoCampusError = (e: unknown) =>
  e instanceof CampusApiError ? e : new CampusApiError(0, 'ERROR', GENERIC_ERROR, {}, '');

export const rolesDeSesion = (): string[] | null => getSession()?.user.roles ?? null;

async function pedir<T>(metodo: 'GET' | 'POST' | 'PUT' | 'PATCH', ruta: string, cuerpo?: unknown, publica = false): Promise<T> {
  try {
    const session = publica ? undefined : getSession() ?? undefined;
    return (await request(BASE + ruta, { method: metodo, body: cuerpo, session })) as T;
  } catch (e) {
    if (e instanceof ApiError) {
      const campos = Object.fromEntries(e.details.map((d) => [d.campo, d.mensaje]));
      throw new CampusApiError(e.status, e.code || 'ERROR', e.message, campos, e.correlationId);
    }
    throw comoCampusError(e);
  }
}

async function imagen(ruta: string): Promise<Blob> {
  const correlationId = crypto.randomUUID();
  const session = getSession();
  const headers: Record<string, string> = { Accept: 'image/png', 'X-Correlation-ID': correlationId };
  if (session) headers.Authorization = `Bearer ${session.token}`;

  let r: Response;
  try {
    r = await fetch(`${API_URL}${BASE}${ruta}`, { headers });
  } catch {
    throw new CampusApiError(0, 'SIN_CONEXION', NETWORK_ERROR, {}, correlationId);
  }
  if (r.ok) return r.blob();

  const cuerpo = (await r.json().catch(() => ({}))) as { codigo?: string; mensaje?: string; correlation_id?: string };
  const mensaje = r.status === 403 ? 'No tienes permiso para generar códigos QR.' : cuerpo.mensaje || GENERIC_ERROR;
  throw new CampusApiError(r.status, cuerpo.codigo ?? 'ERROR', mensaje, {}, cuerpo.correlation_id ?? correlationId);
}

export type ElementoQr = 'espacio' | 'salida' | 'zona';

const RUTAS_QR: Record<ElementoQr, string> = { espacio: 'spaces', salida: 'exits', zona: 'safe-zones' };

export const descargarQr = (elemento: ElementoQr, id: string) => imagen(`/${RUTAS_QR[elemento]}/${id}/qr`);

const filtro = (incluirInactivos?: boolean) => (incluirInactivos ? '?incluirInactivos=true' : '');

export const campus = {
  edificios: {
    listar: (incluirInactivos?: boolean) => pedir<Edificio[]>('GET', `/buildings${filtro(incluirInactivos)}`),
    obtener: (id: string) => pedir<Edificio>('GET', `/buildings/${id}`),
    crear: (datos: EdificioRequest) => pedir<Edificio>('POST', '/buildings', datos),
    modificar: (id: string, datos: ModificarEdificioRequest) => pedir<Edificio>('PUT', `/buildings/${id}`, datos),
    inactivar: (id: string) => pedir<Edificio>('PATCH', `/buildings/${id}/deactivate`),
    reactivar: (id: string) => pedir<Edificio>('PATCH', `/buildings/${id}/reactivate`),
  },
  pisos: {
    listarPorEdificio: (edificioId: string, incluirInactivos?: boolean) =>
      pedir<Piso[]>('GET', `/buildings/${edificioId}/floors${filtro(incluirInactivos)}`),
    obtener: (id: string) => pedir<Piso>('GET', `/floors/${id}`),
    crear: (edificioId: string, datos: PisoRequest) => pedir<Piso>('POST', `/buildings/${edificioId}/floors`, datos),
    modificar: (id: string, datos: PisoRequest) => pedir<Piso>('PUT', `/floors/${id}`, datos),
    inactivar: (id: string) => pedir<Piso>('PATCH', `/floors/${id}/deactivate`),
    reactivar: (id: string) => pedir<Piso>('PATCH', `/floors/${id}/reactivate`),
  },
  espacios: {
    listarPorPiso: (pisoId: string, incluirInactivos?: boolean) =>
      pedir<Espacio[]>('GET', `/floors/${pisoId}/spaces${filtro(incluirInactivos)}`),
    listarPorEdificio: (edificioId: string, incluirInactivos?: boolean) =>
      pedir<Espacio[]>('GET', `/buildings/${edificioId}/spaces${filtro(incluirInactivos)}`),
    obtener: (id: string) => pedir<Espacio>('GET', `/spaces/${id}`),
    crear: (pisoId: string, datos: EspacioRequest) => pedir<Espacio>('POST', `/floors/${pisoId}/spaces`, datos),
    modificar: (id: string, datos: ModificarEspacioRequest) => pedir<Espacio>('PUT', `/spaces/${id}`, datos),
    inactivar: (id: string) => pedir<Espacio>('PATCH', `/spaces/${id}/deactivate`),
    reactivar: (id: string) => pedir<Espacio>('PATCH', `/spaces/${id}/reactivate`),
  },
  escaleras: {
    listarPorEdificio: (edificioId: string, incluirInactivas?: boolean) =>
      pedir<Escalera[]>('GET', `/buildings/${edificioId}/stairs${filtro(incluirInactivas)}`),
    crear: (edificioId: string, datos: EscaleraRequest) =>
      pedir<Escalera>('POST', `/buildings/${edificioId}/stairs`, datos),
    cambiarDisponibilidad: (id: string, datos: CambiarDisponibilidadEscaleraRequest) =>
      pedir<Escalera>('PATCH', `/stairs/${id}/status`, datos),
    inactivar: (id: string) =>
      pedir<Escalera>('PATCH', `/stairs/${id}/deactivate`),
    reactivar: (id: string) =>
      pedir<Escalera>('PATCH', `/stairs/${id}/reactivate`),
  },
  salidas: {
    listarPorEdificio: (edificioId: string, incluirInactivos?: boolean) =>
      pedir<Salida[]>('GET', `/buildings/${edificioId}/exits${filtro(incluirInactivos)}`),
    obtener: (id: string) => pedir<Salida>('GET', `/exits/${id}`),
    crear: (edificioId: string, datos: SalidaRequest) => pedir<Salida>('POST', `/buildings/${edificioId}/exits`, datos),
    modificar: (id: string, datos: ModificarSalidaRequest) => pedir<Salida>('PUT', `/exits/${id}`, datos),
    inactivar: (id: string) => pedir<Salida>('PATCH', `/exits/${id}/deactivate`),
    reactivar: (id: string) => pedir<Salida>('PATCH', `/exits/${id}/reactivate`),
  },
  rutasExteriores: {
    calcular: (datos: CalcularRutaExteriorRequest) => pedir<RutaExterior>('POST', '/evacuation-routes/exterior', datos),
    porSalida: (salidaId: string) => pedir<RutaExterior[]>('GET', `/exits/${salidaId}/evacuation-route`),
    /** Genera las rutas de todas las salidas hacia sus zonas más cercanas. Por defecto solo las que faltan. */
    generar: (recalcular = false) =>
      pedir<ResumenGeneracionRutas>('POST', `/evacuation-routes/exterior/generate${recalcular ? '?recalcular=true' : ''}`),
  },
  zonas: {
    listar: (incluirInactivos?: boolean) => pedir<ZonaSegura[]>('GET', `/safe-zones${filtro(incluirInactivos)}`),
    obtener: (id: string) => pedir<ZonaSegura>('GET', `/safe-zones/${id}`),
    crear: (datos: ZonaSeguraRequest) => pedir<ZonaSegura>('POST', '/safe-zones', datos),
    modificar: (id: string, datos: ModificarZonaSeguraRequest) => pedir<ZonaSegura>('PUT', `/safe-zones/${id}`, datos),    
    inactivar: (id: string) => pedir<ZonaSegura>('PATCH', `/safe-zones/${id}/deactivate`),
    reactivar: (id: string) => pedir<ZonaSegura>('PATCH', `/safe-zones/${id}/reactivate`),
  },
  campuses: {
    listar: (incluirInactivos?: boolean) => pedir<Campus[]>('GET', `/campuses${filtro(incluirInactivos)}`),
    obtener: (id: string) => pedir<Campus>('GET', `/campuses/${id}`),
    crear: (datos: CampusRequest) => pedir<Campus>('POST', '/campuses', datos),
    modificar: (id: string, datos: CampusRequest) => pedir<Campus>('PUT', `/campuses/${id}`, datos),
    inactivar: (id: string) => pedir<Campus>('PATCH', `/campuses/${id}/deactivate`),
    reactivar: (id: string) => pedir<Campus>('PATCH', `/campuses/${id}/reactivate`),
  },
  zonasAbiertas: {
    listarPorCampus: (campusId: string, incluirInactivos?: boolean) =>
      pedir<ZonaAbierta[]>('GET', `/campuses/${campusId}/open-zones${filtro(incluirInactivos)}`),
    obtener: (id: string) => pedir<ZonaAbierta>('GET', `/open-zones/${id}`),
    crear: (campusId: string, datos: ZonaAbiertaRequest) =>
      pedir<ZonaAbierta>('POST', `/campuses/${campusId}/open-zones`, datos),
    modificar: (id: string, datos: ZonaAbiertaRequest) => pedir<ZonaAbierta>('PUT', `/open-zones/${id}`, datos),
    inactivar: (id: string) => pedir<ZonaAbierta>('PATCH', `/open-zones/${id}/deactivate`),
    reactivar: (id: string) => pedir<ZonaAbierta>('PATCH', `/open-zones/${id}/reactivate`),
  },
  rutas: {
    listar: () => pedir<Ruta[]>('GET', '/evacuation-routes'),
    obtener: (id: string) => pedir<Ruta>('GET', `/evacuation-routes/${id}`),
    crear: (datos: CrearRutaRequest) => pedir<Ruta>('POST', '/evacuation-routes', datos),
    actualizar: (id: string, datos: ActualizarRutaRequest) => pedir<Ruta>('PUT', `/evacuation-routes/${id}`, datos),
    cambiarEstado: (id: string, datos: CambiarEstadoRequest) =>
      pedir<Ruta>('PATCH', `/evacuation-routes/${id}/status`, datos),
  },
  recomendaciones: {
    listar: () => pedir<RecomendacionPreventiva[]>('GET', '/preventive-recommendations'),
    porEdificio: (edificioId: string) =>
      pedir<RecomendacionPreventiva[]>('GET', `/preventive-recommendations/building/${edificioId}`),
    porTipoEspacio: (tipo: TipoEspacio) =>
      pedir<RecomendacionPreventiva[]>('GET', `/preventive-recommendations/space-type/${tipo}`),
    crear: (datos: RecomendacionPreventivaRequest) =>
      pedir<RecomendacionPreventiva>('POST', '/preventive-recommendations', datos),
    modificar: (id: string, datos: RecomendacionPreventivaRequest) =>
      pedir<RecomendacionPreventiva>('PUT', `/preventive-recommendations/${id}`, datos),
    inactivar: (id: string) => pedir<RecomendacionPreventiva>('PATCH', `/preventive-recommendations/${id}/deactivate`),
  },
  publico: {
    espacio: (id: string) => pedir<EspacioPublico>('GET', `/public/spaces?id=${encodeURIComponent(id)}`, undefined, true),
    salida: (id: string) => pedir<SalidaPublica>('GET', `/public/exits?id=${encodeURIComponent(id)}`, undefined, true),
    zona: (id: string) => pedir<ZonaSeguraPublica>('GET', `/public/safe-zones?id=${encodeURIComponent(id)}`, undefined, true),
  },
  consulta: {
    porEspacio: (espacioId: string) => pedir<RutaConsultada>('GET', `/spaces/${espacioId}/evacuation-route`),
    porEdificio: (edificioId: string) => pedir<RutaConsultada[]>('GET', `/buildings/${edificioId}/evacuation-routes`),
  },
};
