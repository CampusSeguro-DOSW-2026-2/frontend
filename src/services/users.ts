import { request } from './http';
import type { FieldErrors, Json } from './http';
import type { ProfileData, ProfileDraft, Session, StatusChange, UserPage, UserSearch, UserSummary } from '../types';

/**
 * Cliente de MS01 para el perfil y la administración de usuarios (RF-MS01-03, 06 y 07), a través del
 * API Gateway. El Gateway valida el JWT e inyecta la identidad: aquí solo se envía el token de la sesión.
 */
export { ApiError, errorMessage, GENERIC_ERROR } from './http';
export type { Json } from './http';
export type { FieldErrors };

// Campo del contrato (JSON) → campo del formulario de perfil
const PROFILE_FIELDS: Record<string, string> = {
  primer_nombre: 'firstName',
  segundo_nombre: 'secondName',
  primer_apellido: 'firstLastName',
  segundo_apellido: 'secondLastName',
};

// ---- Conversión de respuestas ---------------------------------------------

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const list = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
const record = (value: unknown): Json => (typeof value === 'object' && value !== null ? (value as Json) : {});
const count = (value: unknown): number => (typeof value === 'number' ? value : 0);

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

/** Página estándar de los Estándares de Integración: { contenido, page, size, total_elementos, total_paginas }. */
function toPage(d: Json): UserPage {
  const rows = Array.isArray(d.contenido) ? d.contenido : [];
  return {
    items: rows.map((row) => toSummary(record(row))),
    page: count(d.page),
    size: count(d.size),
    totalElements: count(d.total_elementos),
    totalPages: count(d.total_paginas),
  };
}

// ---- Operaciones -------------------------------------------------------------

/** GET /api/v1/users/me: perfil del usuario autenticado. */
export async function getMyProfile(session: Session): Promise<ProfileData> {
  const data = await request('/api/v1/users/me', { session });
  return toProfile(record(data));
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

  const data = await request('/api/v1/users/me', { method: 'PUT', body, session, fields: PROFILE_FIELDS });
  return toProfile(record(data));
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

  const data = await request(`/api/v1/users?${params.toString()}`, { session });
  return toPage(record(data));
}

/** PATCH /api/v1/users/status: cambia el estado de varios usuarios a la vez (solo administrador). */
export async function changeUsersStatus(session: Session, ids: string[], state: string): Promise<StatusChange[]> {
  const data = await request('/api/v1/users/status', {
    method: 'PATCH',
    body: { ids, estado: state },
    session,
  });

  const results = record(data).resultados;
  const rows = Array.isArray(results) ? results : [];
  return rows.map((item) => {
    const r = record(item);
    return { id: String(r.id), previous: text(r.estado_anterior), next: text(r.estado_nuevo) };
  });
}
