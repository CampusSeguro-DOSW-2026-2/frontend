import type {
  ActualizarRutaRequest, CambiarEstadoRequest, CrearRutaRequest, Edificio, EdificioRequest, ErrorResponse, Espacio,
  EspacioRequest, ModificarEdificioRequest, ModificarEspacioRequest, Piso, PisoRequest, RecomendacionPreventiva,
  RecomendacionPreventivaRequest, Ruta, RutaConsultada, TipoEspacio, ZonaSegura, ZonaSeguraRequest, ModificarZonaSeguraRequest
} from '../types/campus';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080/api/v1';

const SESSION_KEY = 'campusseguro.session';

const MENSAJES = {
  sinConexion: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  sesion: 'Tu sesión no es válida o ya venció. Vuelve a iniciar sesión.',
  permiso: 'No tienes permiso para realizar esta acción.',
  noDisponible: 'El servicio de campus no está disponible en este momento. Inténtalo más tarde.',
  inesperado: 'Ocurrió un error inesperado. Inténtalo más tarde.',
};

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
  e instanceof CampusApiError ? e : new CampusApiError(0, 'ERROR', MENSAJES.inesperado, {}, '');

interface SesionGuardada {
  token?: string;
  expiresAt?: string;
  user?: { roles?: string[] };
}

function sesionVigente(): SesionGuardada | null {
  for (const nombre of ['localStorage', 'sessionStorage'] as const) {
    try {
      const raw = window[nombre].getItem(SESSION_KEY);
      if (!raw) continue;
      const sesion = JSON.parse(raw) as SesionGuardada;
      if (sesion.token && Date.parse(sesion.expiresAt ?? '') > Date.now()) return sesion;
    } catch {
      continue;
    }
  }
  return null;
}

export const rolesDeSesion = (): string[] | null => sesionVigente()?.user?.roles ?? null;

function mensajePara(status: number, mensajeDelServidor?: string): string {
  if (status === 401) return MENSAJES.sesion;
  if (status === 403) return MENSAJES.permiso;
  if (status === 502 || status === 503 || status === 504) return MENSAJES.noDisponible;
  if (status >= 500) return MENSAJES.inesperado;
  return mensajeDelServidor || MENSAJES.inesperado;
}

async function aError(r: Response, enviado: string): Promise<CampusApiError> {
  const correlationId = r.headers.get('X-Correlation-ID') ?? enviado;
  try {
    const cuerpo = (await r.json()) as Partial<ErrorResponse>;
    const campos = Object.fromEntries((cuerpo.errores ?? []).map((e) => [e.campo, e.mensaje]));
    return new CampusApiError(r.status, cuerpo.codigo ?? 'ERROR', mensajePara(r.status, cuerpo.mensaje), campos,
      cuerpo.correlation_id ?? correlationId);
  } catch {
    return new CampusApiError(r.status, 'ERROR', mensajePara(r.status), {}, correlationId);
  }
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const correlationId = crypto.randomUUID();
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Correlation-ID': correlationId };
  const token = sesionVigente()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';

  let r: Response;
  try {
    r = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new CampusApiError(0, 'SIN_CONEXION', MENSAJES.sinConexion, {}, correlationId);
  }
  if (!r.ok) throw await aError(r, correlationId);
  return (r.status === 204 ? undefined : await r.json()) as T;
}

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
  zonas: {
    listar: (incluirInactivos?: boolean) => pedir<ZonaSegura[]>('GET', `/safe-zones${filtro(incluirInactivos)}`),
    obtener: (id: string) => pedir<ZonaSegura>('GET', `/safe-zones/${id}`),
    crear: (datos: ZonaSeguraRequest) => pedir<ZonaSegura>('POST', '/safe-zones', datos),
    modificar: (id: string, datos: ModificarZonaSeguraRequest) => pedir<ZonaSegura>('PUT', `/safe-zones/${id}`, datos),    
    inactivar: (id: string) => pedir<ZonaSegura>('PATCH', `/safe-zones/${id}/deactivate`),
    reactivar: (id: string) => pedir<ZonaSegura>('PATCH', `/safe-zones/${id}/reactivate`),
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
  consulta: {
    porEspacio: (espacioId: string) => pedir<RutaConsultada>('GET', `/spaces/${espacioId}/evacuation-route`),
    porEdificio: (edificioId: string) => pedir<RutaConsultada[]>('GET', `/buildings/${edificioId}/evacuation-routes`),
  },
};
