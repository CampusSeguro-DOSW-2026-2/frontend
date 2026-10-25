import { ApiError } from './identity';
import { call, GENERIC_ERROR } from './users';
import type { Json } from './users';
import type { RoleChange, RolePermissions, RolesDraft, Session } from '../types';

/**
 * Cliente de MS01 para roles y permisos (RF-MS01-05, KAIR-36 y KAIR-41).
 *
 * Usa las mismas cabeceras de identidad que el resto de MS01 (X-User-Id y X-User-Role, tomadas de la
 * sesión mientras no haya gateway).
 */

/** Campos del formulario F-09 a los que puede apuntar un error 400 del back. */
export type RoleField = 'ids' | 'add' | 'remove';

// El back nombra los campos como el cuerpo de la petición: ids, agregar y retirar
const FIELD_MAP: Record<string, RoleField> = { ids: 'ids', agregar: 'add', retirar: 'remove' };

const UNAUTHENTICATED = 'Tu sesión no es válida o venció. Inicia sesión de nuevo.';

/** Error de roles: además del mensaje trae el detalle por campo del formulario F-09. */
export class RolesApiError extends ApiError {
  roleFields: Partial<Record<RoleField, string>>;

  constructor(status: number, message: string, roleFields: Partial<Record<RoleField, string>> = {}) {
    super(status, message);
    this.roleFields = roleFields;
  }
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const list = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

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

/** Errores por campo de un 400: { errores: [{ campo, mensaje }] }. */
function roleFieldErrors(data: Json): Partial<Record<RoleField, string>> {
  const fields: Partial<Record<RoleField, string>> = {};
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

function failure(status: number, data: Json): RolesApiError {
  if (status === 400) {
    const fields = roleFieldErrors(data);
    // Los ids no tienen campo propio en la pantalla (vienen de la selección): su mensaje va arriba
    if (fields.ids) {
      return new RolesApiError(400, fields.ids, fields);
    }
    if (fields.add || fields.remove) {
      return new RolesApiError(400, 'Revisa los datos ingresados.', fields);
    }
    return new RolesApiError(400, messageFrom(data, 'Revisa los datos ingresados.'));
  }
  if (status === 401) {
    return new RolesApiError(401, UNAUTHENTICATED);
  }
  if (status === 403) {
    return new RolesApiError(403, messageFrom(data, 'No cuentas con permisos para realizar esta operación.'));
  }
  if (status === 404) {
    return new RolesApiError(404, messageFrom(data, 'Usuario no encontrado.'));
  }
  return new RolesApiError(status, GENERIC_ERROR);
}

/**
 * GET /api/v1/roles: roles con los permisos que concede cada uno. El administrador recibe el catálogo
 * completo (ms01:role:read_all); cualquier otro usuario, solo sus propios roles.
 */
export async function getRoles(session: Session): Promise<RolePermissions[]> {
  const { res, data } = await call(session, '/api/v1/roles');
  if (!res.ok) {
    throw failure(res.status, data);
  }

  // Esta respuesta es una lista, no un objeto
  const body: unknown = data;
  const rows = Array.isArray(body) ? body : [];
  return rows.map((row) => {
    const r = row as Json;
    return { role: text(r.rol), permissions: list(r.permisos) };
  });
}

/**
 * PATCH /api/v1/users/roles: agrega y retira roles a uno o varios usuarios en una sola operación
 * (solo administrador). La operación es atómica: si algo falla no se aplica ningún cambio.
 */
export async function changeUserRoles(session: Session, ids: string[], d: RolesDraft): Promise<RoleChange[]> {
  const body: Record<string, string[]> = { ids };
  if (d.add.length > 0) {
    body.agregar = d.add;
  }
  if (d.remove.length > 0) {
    body.retirar = d.remove;
  }

  const { res, data } = await call(session, '/api/v1/users/roles', { method: 'PATCH', body });
  if (!res.ok) {
    throw failure(res.status, data);
  }

  const results = Array.isArray(data.resultados) ? data.resultados : [];
  return results.map((item) => {
    const r = item as Json;
    return { id: String(r.id), roles: list(r.roles) };
  });
}
