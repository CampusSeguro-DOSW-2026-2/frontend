import { ApiError, request } from './http';
import type { Json } from './http';
import type { RoleChange, RolePermissions, RolesDraft, Session } from '../types';

/**
 * Cliente de MS01 para roles y permisos (RF-MS01-05), a través del API Gateway. El Gateway valida el JWT
 * e inyecta la identidad: aquí solo se envía el token de la sesión.
 */

/** Campos del formulario F-09 a los que puede apuntar un error 400 del back. */
export type RoleField = 'ids' | 'add' | 'remove';

// El back nombra los campos como el cuerpo de la petición: ids, agregar y retirar
const FIELD_MAP: Record<string, RoleField> = { ids: 'ids', agregar: 'add', retirar: 'remove' };

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
const record = (value: unknown): Json => (typeof value === 'object' && value !== null ? (value as Json) : {});

/** Errores por campo de un 400: errores: [{ campo, mensaje }]. */
function roleFieldErrors(err: ApiError): Partial<Record<RoleField, string>> {
  const fields: Partial<Record<RoleField, string>> = {};
  for (const detail of err.details) {
    const field = FIELD_MAP[detail.campo];
    if (field) {
      fields[field] ??= detail.mensaje;
    }
  }
  return fields;
}

/** Convierte un error de la API en uno de roles, con el detalle por campo de F-09. */
function toRolesError(err: unknown): unknown {
  if (!(err instanceof ApiError)) {
    return err;
  }

  const fields = roleFieldErrors(err);
  let message = err.message;
  if (err.status === 400) {
    if (fields.ids) {
      // Los ids no tienen campo propio en la pantalla (vienen de la selección): su mensaje va arriba
      message = fields.ids;
    } else if (fields.add || fields.remove) {
      message = 'Revisa los datos ingresados.';
    }
  }

  const converted = new RolesApiError(err.status, message, fields);
  converted.code = err.code;
  converted.details = err.details;
  converted.correlationId = err.correlationId;
  return converted;
}

/**
 * GET /api/v1/roles: roles con los permisos que concede cada uno. El administrador recibe el catálogo
 * completo (ms01:role:read_all); cualquier otro usuario, solo sus propios roles.
 */
export async function getRoles(session: Session): Promise<RolePermissions[]> {
  let data: unknown;
  try {
    data = await request('/api/v1/roles', { session });
  } catch (err) {
    throw toRolesError(err);
  }

  // Esta respuesta es una lista, no un objeto
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => {
    const r = record(row);
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

  let data: unknown;
  try {
    data = await request('/api/v1/users/roles', { method: 'PATCH', body, session });
  } catch (err) {
    throw toRolesError(err);
  }

  const results = record(data).resultados;
  const rows = Array.isArray(results) ? results : [];
  return rows.map((item) => {
    const r = record(item);
    return { id: String(r.id), roles: list(r.roles) };
  });
}
