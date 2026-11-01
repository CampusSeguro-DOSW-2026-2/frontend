import type { Session } from '../types';
import { clearSession, getSession, setSessionNotice } from './session';

/**
 * Cliente HTTP único de CampusSeguro. Todo el tráfico del frontend entra por el API Gateway
 * (Estándares de Integración §2): el frontend nunca llama a un microservicio directamente.
 *
 * - Las rutas protegidas llevan solo `Authorization: Bearer <JWT>`. La identidad (`X-User-Id`,
 *   `X-User-Role`) la inyecta el Gateway a partir del token y el navegador nunca la envía.
 * - Las rutas públicas (registro, login, recuperación de contraseña) no llevan `Authorization`.
 * - Cada petición lleva un `X-Correlation-ID` (UUID v4) para poder rastrearla de extremo a extremo.
 * - Todo error llega como `ErrorResponse` { status, codigo, mensaje, errores, correlation_id } y se
 *   convierte en un `ApiError` con un mensaje listo para mostrar.
 */

const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

/** Dirección del Gateway (sin barra final). En local es http://localhost:8080. */
export const API_URL = (configured ? configured : 'http://localhost:8080').replace(/\/+$/, '');

/** Tiempo máximo de espera del navegador; el Gateway ya corta a los 3 s hacia cada servicio. */
const TIMEOUT_MS = 15000;

export const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intenta de nuevo en unos minutos.';
export const GENERIC_ERROR = 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';
export const SESSION_EXPIRED = 'Tu sesión no es válida o venció. Inicia sesión de nuevo.';
const VALIDATION_ERROR = 'Revisa los datos ingresados.';
const FORBIDDEN_ERROR = 'No cuentas con permisos para realizar esta operación.';
const NOT_FOUND_ERROR = 'No se encontró lo que buscas.';
const BAD_GATEWAY_ERROR = 'El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.';
const TIMEOUT_ERROR = 'El servicio tardó demasiado en responder. Intenta de nuevo.';
const INVALID_CODE_ERROR = 'Código incorrecto o vencido.';

export type Json = Record<string, unknown>;

/** Error por campo tal como lo manda el servidor: `errores: [{ campo, mensaje }]`. */
export interface ErrorDetail {
  campo: string;
  mensaje: string;
}

/** Errores por campo del formulario ya traducidos a sus nombres (campo del formulario → mensaje). */
export type FieldErrors = Partial<Record<string, string>>;

/** Error de la API: trae el mensaje a mostrar, el código del catálogo y el detalle por campo. */
export class ApiError extends Error {
  /** Estado HTTP; 0 si no hubo respuesta (sin conexión o tiempo agotado). */
  status: number;
  /** Código del catálogo de errores (VALIDACION, CONFLICTO, ...); vacío si no llegó. */
  code: string;
  /** Errores por campo mapeados a los campos del formulario. */
  fields: FieldErrors;
  /** Errores por campo tal como llegaron del servidor. */
  details: ErrorDetail[];
  /** Identificador de la petición para soporte (X-Correlation-ID). */
  correlationId: string;

  constructor(
    status: number,
    message: string,
    fields: FieldErrors = {},
    code = '',
    details: ErrorDetail[] = [],
    correlationId = '',
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
    this.correlationId = correlationId;
  }
}

/** Mensaje listo para mostrar a partir de cualquier error. */
export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : GENERIC_ERROR;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Sesión con la que se firma la petición: sin ella la ruta se llama como pública. */
  session?: Session;
  /** Campo del contrato (JSON) → campo del formulario, para los errores 400 por campo. */
  fields?: Record<string, string>;
  /** Si es false, un 401 no cierra la sesión local (lo usa el cierre de sesión). */
  expireOn401?: boolean;
}

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null;
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** UUID v4 de la petición; no depende de contexto seguro (https) para funcionar. */
function newCorrelationId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseDetails(value: unknown): ErrorDetail[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const details: ErrorDetail[] = [];
  for (const item of value) {
    if (isObject(item) && typeof item.campo === 'string' && typeof item.mensaje === 'string') {
      details.push({ campo: item.campo, mensaje: item.mensaje });
    }
  }
  return details;
}

/** Mensaje para el usuario según el código del catálogo (Estándares §5) y el estado HTTP. */
function messageFor(status: number, code: string, server: string, unmapped: ErrorDetail[]): string {
  switch (code) {
    case 'VALIDACION':
      return unmapped.length > 0 ? unmapped[0].mensaje : VALIDATION_ERROR;
    case 'CODIGO_INVALIDO':
      return INVALID_CODE_ERROR;
    case 'NO_AUTENTICADO':
      return SESSION_EXPIRED;
    case 'CREDENCIALES_INCORRECTAS':
      return server || 'Credenciales incorrectas.';
    case 'PROHIBIDO':
      return server || FORBIDDEN_ERROR;
    case 'CUENTA_INACTIVA':
      return server || 'Cuenta inactiva. Contacte al administrador.';
    case 'NO_ENCONTRADO':
      return server || NOT_FOUND_ERROR;
    case 'CONFLICTO':
    case 'REGLA_NEGOCIO':
      return server || GENERIC_ERROR;
    case 'SERVICIO_NO_DISPONIBLE':
      return BAD_GATEWAY_ERROR;
    case 'TIEMPO_AGOTADO':
      return TIMEOUT_ERROR;
    case 'METODO_NO_PERMITIDO':
    case 'TIPO_NO_SOPORTADO':
    case 'ERROR_INTERNO':
      return GENERIC_ERROR;
    default:
      break;
  }

  // Respuesta sin el cuerpo estándar (por ejemplo, un proxy intermedio): se decide por el estado HTTP
  if (status === 400) {
    return VALIDATION_ERROR;
  }
  if (status === 401) {
    return SESSION_EXPIRED;
  }
  if (status === 403) {
    return FORBIDDEN_ERROR;
  }
  if (status === 404) {
    return NOT_FOUND_ERROR;
  }
  if (status === 502) {
    return BAD_GATEWAY_ERROR;
  }
  if (status === 504) {
    return TIMEOUT_ERROR;
  }
  return GENERIC_ERROR;
}

/** Los errores del servidor se acompañan de la referencia de la petición para que soporte pueda rastrearla. */
function withReference(message: string, status: number, correlationId: string): string {
  if (status >= 500 && correlationId) {
    return `${message} Referencia: ${correlationId}.`;
  }
  return message;
}

function buildError(
  status: number,
  body: unknown,
  headerCorrelationId: string | null,
  fieldMap: Record<string, string>,
): ApiError {
  const data = isObject(body) ? body : {};
  const code = text(data.codigo);
  const server = text(data.mensaje);
  const details = parseDetails(data.errores);
  const correlationId = text(data.correlation_id) || headerCorrelationId || '';

  const fields: FieldErrors = {};
  const unmapped: ErrorDetail[] = [];
  for (const detail of details) {
    const field = fieldMap[detail.campo];
    if (field) {
      fields[field] ??= detail.mensaje;
    } else {
      unmapped.push(detail);
    }
  }

  const message = withReference(messageFor(status, code, server, unmapped), status, correlationId);
  return new ApiError(status, message, fields, code, details, correlationId);
}

/** Cierra la sesión local y envía al inicio de sesión (token vencido o no válido). */
function expireSession(session: Session): void {
  // Una respuesta tardía de una sesión anterior no debe cerrar la sesión que inició después
  if (getSession()?.token !== session.token) {
    return;
  }
  clearSession();
  setSessionNotice(SESSION_EXPIRED);
  window.location.hash = '#/login';
}

/**
 * Llama a una ruta del Gateway y devuelve el cuerpo JSON de la respuesta (null si no trae cuerpo).
 * Ante cualquier error lanza un `ApiError`.
 */
export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const { method = 'GET', body, session, fields = {}, expireOn401 = true } = options;
  const correlationId = newCorrelationId();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Correlation-ID': correlationId,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (session) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  let parsed: unknown = null;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    parsed = await res.json().catch(() => null);
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError(0, TIMEOUT_ERROR, {}, 'TIEMPO_AGOTADO', [], correlationId);
    }
    throw new ApiError(0, NETWORK_ERROR, {}, '', [], correlationId);
  } finally {
    clearTimeout(timer);
  }

  if (res.ok) {
    return parsed;
  }

  const error = buildError(res.status, parsed, res.headers.get('X-Correlation-ID') ?? correlationId, fields);
  if (res.status === 401 && session && expireOn401) {
    expireSession(session);
  }
  throw error;
}

/** Texto de la clave `mensaje` de una respuesta de confirmación ({ "mensaje": "..." }). */
export function messageOf(data: unknown, fallback: string): string {
  if (isObject(data)) {
    const message = text(data.mensaje);
    if (message) {
      return message;
    }
  }
  return fallback;
}
