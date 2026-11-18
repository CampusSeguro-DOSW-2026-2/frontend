import { ApiError, request, SERVICE_UNAVAILABLE } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type { EventDetail, EventFinish, EventInput, EventStatus, EventSummary, EventType, Page } from '../types';

/**
 * Cliente de MS06 (Eventos). Todo pasa por el API Gateway con el JWT de la sesión (Estándares §2).
 * MS06 responde los errores en el formato estándar { status, codigo, mensaje, errores, correlation_id }; aquí se cambia el mensaje por uno propio según el código.
 */
const BASE = '/api/v1/eventos';

const MESSAGES: Record<string, string> = {
  VALIDACION: 'Revise los campos marcados.',
  PROHIBIDO: 'Su rol no permite esta acción: los simulacros los gestiona el organizador y los eventos reales, el coordinador.',
  NO_ENCONTRADO: 'El evento no existe.',
  CONFLICTO: 'No se pudo guardar: choca con otro evento (solo puede haber uno en ejecución a la vez).',
  MODIFICACION_CONCURRENTE: 'Otra persona modificó el evento. Recargue la página e intente de nuevo.',
  TRANSICION_INVALIDA: 'El evento ya no admite esa acción en su estado actual.',
  EVENTO_NO_EDITABLE: 'Un evento Finalizado no se puede editar.',
  EVENTO_NO_ACTIVO: 'Solo se puede finalizar un evento en ejecución.',
  SERVICIO_EXTERNO_NO_DISPONIBLE: SERVICE_UNAVAILABLE,
};

/** Campo del contrato → campo del formulario, para marcar los errores 400. */
const FIELDS: Record<string, string> = {
  name: 'name', description: 'description', startDate: 'startDate', scope: 'scope', participantRoles: 'participantRoles', typeIds: 'name',
};

async function call<T>(path: string, session: Session, options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH'; body?: unknown } = {}): Promise<T> {
  try {
    return (await request(path, { ...options, session, fields: FIELDS })) as T;
  } catch (err) {
    if (err instanceof ApiError && MESSAGES[err.code]) {
      throw new ApiError(err.status, MESSAGES[err.code], err.fields, err.code, err.details, err.correlationId);
    }
    throw err;
  }
}

/**
 * MS06 pages follow the Gateway standard: { contenido, page, size, total_elementos, total_paginas }.
 * The screens use { content, totalElements, totalPages }, so the answer is converted here.
 */
interface StandardPage<T> { contenido?: T[]; page?: number; size?: number; total_elementos?: number; total_paginas?: number }
const toPage = <T>(raw: StandardPage<T>): Page<T> => ({
  content: raw.contenido ?? [],
  page: raw.page ?? 0,
  size: raw.size ?? 0,
  totalElements: raw.total_elementos ?? 0,
  totalPages: raw.total_paginas ?? 0,
});

export const eventsApi = {
  async search(session: Session, filters: { title?: string; status?: EventStatus | ''; page?: number; size?: number }) {
    const q = new URLSearchParams();
    if (filters.title?.trim()) q.set('title', filters.title.trim());
    if (filters.status) q.set('status', filters.status);
    q.set('page', String(filters.page ?? 0));
    q.set('size', String(filters.size ?? 20));
    return toPage(await call<StandardPage<EventSummary>>(`${BASE}?${q}`, session));
  },
  active: (session: Session) => call<EventSummary[]>(`${BASE}/activos`, session),
  detail: (session: Session, id: string) => call<EventDetail>(`${BASE}/${encodeURIComponent(id)}`, session),
  create: (session: Session, body: EventInput) => call<EventDetail['event']>(BASE, session, { method: 'POST', body }),
  update: (session: Session, id: string, body: EventInput) =>
    call<EventDetail['event']>(`${BASE}/${encodeURIComponent(id)}`, session, { method: 'PUT', body }),
  finish: (session: Session, id: string) => call<EventFinish>(`${BASE}/${encodeURIComponent(id)}/finalizar`, session, { method: 'PATCH' }),
  types: (session: Session) => call<EventType[]>('/api/v1/tipos-evento', session),
};

/** MS06 (RN-4 y RN-5): el organizador solo gestiona simulacros y el coordinador solo eventos reales. */
export const isOrganizer = (session: Session) => session.user.roles.includes('ORGANIZADOR');
export const canManageEvent = (session: Session, simulacro: boolean) =>
  session.user.roles.includes(simulacro ? 'ORGANIZADOR' : 'COORDINADOR');

/**
 * Por decisión del equipo el formulario no muestra tipos de evento, pero MS06 exige al menos uno.
 * Se elige según el rol: el organizador crea simulacros ("Simulacro") y el coordinador eventos reales ("Otro").
 */
export async function defaultTypeId(session: Session): Promise<string> {
  const code = isOrganizer(session) ? 'SIMULACRO' : 'OTRO';
  const types = await eventsApi.types(session);
  const found = types.find((t) => t.code === code && t.active);
  if (!found) {
    throw new ApiError(0, 'No se encontró el tipo de evento en el catálogo. Intente de nuevo más tarde.');
  }
  return found.id;
}
