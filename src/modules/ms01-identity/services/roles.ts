import { ApiError, request } from '../../../shared/services/http';
import type { Json } from '../../../shared/services/http';
import type { PermissionItem, RoleChange, RoleDetail, RoleDraft, RolePermissions, RolesDraft } from '../types';
import type { Session } from '../../../shared/types';

/**
 * Cliente de MS01 para roles y permisos (RF-MS01-05 y RF-MS01-10), a través del API Gateway. El Gateway valida el
 * JWT e inyecta la identidad: aquí solo se envía el token de la sesión.
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
      message = 'Revise los datos ingresados.';
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

// ---- Gestión de roles (RF-MS01-10) -------------------------------------------

/** Campo del contrato → campo de los formularios F-10, F-11 y F-12, para los errores 400 por campo. */
const ROLE_FORM_FIELDS: Record<string, string> = { rol: 'name', descripcion: 'description', permisos: 'permissions' };

const rolePath = (role: string) => `/api/v1/roles/${encodeURIComponent(role)}`;

function toRoleDetail(value: unknown): RoleDetail {
  const r = record(value);
  return { role: text(r.rol), description: text(r.descripcion), permissions: list(r.permisos), system: r.es_sistema === true };
}

/** GET /api/v1/roles/details: todos los roles con su descripción, sus permisos y si son de sistema (ms01:role:read_all). */
export async function getRoleDetails(session: Session): Promise<RoleDetail[]> {
  const data = await request('/api/v1/roles/details', { session });
  return (Array.isArray(data) ? data : []).map(toRoleDetail);
}

/** GET /api/v1/permissions: catálogo de permisos, ordenado por código (ms01:role:read_all). */
export async function getPermissionCatalog(session: Session): Promise<PermissionItem[]> {
  const data = await request('/api/v1/permissions', { session });
  return (Array.isArray(data) ? data : []).map((row) => {
    const r = record(row);
    return { code: text(r.permiso), description: text(r.descripcion) };
  });
}

/**
 * POST /api/v1/roles (F-10): crea un rol que no es de sistema. El nombre se envía recortado y en mayúsculas (RG-08);
 * el sistema agrega siempre ms01:profile:read y ms01:session:logout (RN-MS01-41).
 */
export async function createRole(session: Session, d: RoleDraft): Promise<RoleDetail> {
  const body = { rol: d.name.trim().toUpperCase(), descripcion: d.description.trim(), permisos: d.permissions };
  const data = await request('/api/v1/roles', { method: 'POST', body, session, fields: ROLE_FORM_FIELDS });
  return toRoleDetail(data);
}

/** PUT /api/v1/roles/{rol} (F-11): cambia el nombre y la descripción. Los permisos no se envían aquí. */
export async function updateRole(session: Session, role: string, d: RoleDraft): Promise<RoleDetail> {
  const body = { rol: d.name.trim().toUpperCase(), descripcion: d.description.trim() };
  const data = await request(rolePath(role), { method: 'PUT', body, session, fields: ROLE_FORM_FIELDS });
  return toRoleDetail(data);
}

/** PUT /api/v1/roles/{rol}/permissions (F-12): reemplaza la lista completa de permisos del rol. */
export async function updateRolePermissions(session: Session, role: string, permissions: string[]): Promise<RoleDetail> {
  const data = await request(`${rolePath(role)}/permissions`, {
    method: 'PUT', body: { permisos: permissions }, session, fields: ROLE_FORM_FIELDS,
  });
  return toRoleDetail(data);
}

/** DELETE /api/v1/roles/{rol} (F-13): borra un rol que no es de sistema. Responde 204 sin cuerpo. */
export async function deleteRole(session: Session, role: string): Promise<void> {
  await request(rolePath(role), { method: 'DELETE', session });
}
