import { ApiError } from './identity';
import type { FieldErrors } from './identity';
import type { ProfileData, ProfileDraft, Session, StatusChange, UserPage, UserSearch, UserSummary } from '../types';

/**
 * Cliente de MS01 para el perfil y la administración de usuarios (KAIR-46 y KAIR-51).
 *
 * MS01 identifica a quien consulta por los headers X-User-Id y X-User-Role (los que normalmente pone el
 * API Gateway al validar el JWT). Mientras no haya gateway, el front los toma de la sesión iniciada.
 */
const MS01_URL = (import.meta.env.VITE_MS01_URL as string | undefined) ?? 'http://localhost:8080';

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intenta de nuevo en unos minutos.';
export const GENERIC_ERROR = 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';

export type Json = Record<string, unknown>;

/** Mensaje listo para mostrar a partir de cualquier error. */
export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : GENERIC_ERROR;
}

function authHeaders(session: Session): Record<string, string> {
  return {
    Authorization: `${session.tokenType} ${session.token}`,
    'X-User-Id': session.user.id,
    'X-User-Role': session.user.roles.join(','),
  };
}

export async function call(
  session: Session,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ res: Response; data: Json }> {
  const headers = authHeaders(session);
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(`${MS01_URL}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }

  const parsed: unknown = await res.json().catch(() => null);
  const data = (parsed !== null && typeof parsed === 'object' ? parsed : {}) as Json;
  return { res, data };
}

// ---- Errores ---------------------------------------------------------------

// El back responde los 400 de validación como { <campo del DTO>: <mensaje> } o { errores: [{ campo, mensaje }] }
const FIELD_MAP: Record<string, keyof FieldErrors> = {
  primer_nombre: 'firstName',
  segundo_nombre: 'secondName',
  primer_apellido: 'firstLastName',
  segundo_apellido: 'secondLastName',
};

function fieldErrors(data: Json): FieldErrors {
  const fields: FieldErrors = {};
  for (const [key, msg] of Object.entries(data)) {
    const field = FIELD_MAP[key];
    if (field && typeof msg === 'string') {
      fields[field] = msg;
    }
  }
  if (Array.isArray(data.errores)) {
    for (const item of data.errores) {
      const detail = item as Json;
      const field = FIELD_MAP[String(detail.campo)];
      if (field && typeof detail.mensaje === 'string') {
        fields[field] = detail.mensaje;
      }
    }
  }
  return fields;
}

/** Mensaje del back ("mensaje" o "error"); si no llega, el texto de respaldo. */
function messageFrom(data: Json, fallback: string): string {
  for (const key of ['mensaje', 'error']) {
    const value = data[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return fallback;
}

function failure(status: number, data: Json): ApiError {
  if (status === 400) {
    return new ApiError(400, messageFrom(data, 'Revisa los datos ingresados.'), fieldErrors(data));
  }
  if (status === 403) {
    return new ApiError(403, messageFrom(data, 'No cuentas con permisos para realizar esta operación.'));
  }
  if (status === 404) {
    return new ApiError(404, messageFrom(data, 'No se encontró el usuario.'));
  }
  return new ApiError(status, GENERIC_ERROR);
}

// ---- Conversión de respuestas ---------------------------------------------

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const list = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

function toProfile(d: Json): ProfileData {
  return {
    firstName: text(d.primer_nombre),
    secondName: text(d.segundo_nombre),
    firstLastName: text(d.primer_apellido),
    secondLastName: text(d.segundo_apellido),
    email: text(d.correo),
    roles: list(d.roles),
    state: text(d.estado),
  };
}

function toSummary(d: Json): UserSummary {
  return { id: String(d.id), email: text(d.correo), roles: list(d.roles), state: text(d.estado) };
}

/** Acepta la página del back (contenido, pagina, tamano, totalElementos, totalPaginas) o la de PagedModel. */
function toPage(d: Json): UserPage {
  let rows: unknown[] = [];
  if (Array.isArray(d.contenido)) {
    rows = d.contenido;
  } else if (Array.isArray(d.content)) {
    rows = d.content;
  }
  const meta = (typeof d.page === 'object' && d.page !== null ? d.page : {}) as Json;
  const num = (...values: unknown[]): number => {
    const found = values.find((v) => typeof v === 'number');
    return typeof found === 'number' ? found : 0;
  };

  return {
    items: rows.map((row) => toSummary(row as Json)),
    page: num(d.pagina, meta.number),
    size: num(d.tamano, meta.size),
    totalElements: num(d.totalElementos, meta.totalElements),
    totalPages: num(d.totalPaginas, meta.totalPages),
  };
}

// ---- Operaciones -------------------------------------------------------------

/** GET /api/v1/users/me: perfil del usuario autenticado. */
export async function getMyProfile(session: Session): Promise<ProfileData> {
  const { res, data } = await call(session, '/api/v1/users/me');
  if (!res.ok) {
    throw failure(res.status, data);
  }
  return toProfile(data);
}

/** PUT /api/v1/users/me: solo nombres y apellidos. Un segundo nombre o apellido ausente se borra. */
export async function updateMyProfile(session: Session, d: ProfileDraft): Promise<ProfileData> {
  const body: Record<string, string> = {
    primer_nombre: d.firstName.trim(),
    primer_apellido: d.firstLastName.trim(),
  };
  if (d.secondName.trim()) {
    body.segundo_nombre = d.secondName.trim();
  }
  if (d.secondLastName.trim()) {
    body.segundo_apellido = d.secondLastName.trim();
  }

  const { res, data } = await call(session, '/api/v1/users/me', { method: 'PUT', body });
  if (!res.ok) {
    throw failure(res.status, data);
  }
  return toProfile(data);
}

/** GET /api/v1/users: listado paginado con búsqueda por correo y filtros por estado y rol (admin y auditor). */
export async function searchUsers(session: Session, q: UserSearch): Promise<UserPage> {
  const params = new URLSearchParams({ page: String(q.page), size: String(q.size) });
  if (q.email.trim()) {
    params.set('correo', q.email.trim());
  }
  if (q.state) {
    params.set('estado', q.state);
  }
  if (q.role) {
    params.set('rol', q.role);
  }

  const { res, data } = await call(session, `/api/v1/users?${params.toString()}`);
  if (!res.ok) {
    throw failure(res.status, data);
  }
  return toPage(data);
}

/** PATCH /api/v1/users/status: cambia el estado de varios usuarios a la vez (solo administrador). */
export async function changeUsersStatus(session: Session, ids: string[], state: string): Promise<StatusChange[]> {
  const { res, data } = await call(session, '/api/v1/users/status', {
    method: 'PATCH',
    body: { ids, estado: state },
  });
  if (!res.ok) {
    throw failure(res.status, data);
  }

  const results = Array.isArray(data.resultados) ? data.resultados : [];
  return results.map((item) => {
    const r = item as Json;
    return { id: String(r.id), previous: text(r.estado_anterior), next: text(r.estado_nuevo) };
  });
}
