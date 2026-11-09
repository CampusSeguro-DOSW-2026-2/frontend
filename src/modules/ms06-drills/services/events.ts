import { ApiError, request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type { EventDetail, EventFinish, EventInput, EventStatus, EventSummary, EventType, Page } from '../types';

/**
 * Cliente de MS06 (Eventos). Todo pasa por el API Gateway con el JWT de la sesión (Estándares §2).
 * MS06 responde los errores en inglés con { code, message, details }; aquí se traducen por código.
 */
const BASE = '/api/v1/eventos';

const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Revisa los campos marcados.',
  FORBIDDEN: 'Tu rol no puede hacer esta acción: los simulacros los gestiona el organizador y los eventos reales el coordinador.',
  RESOURCE_NOT_FOUND: 'El evento no existe.',
  CONFLICT: 'No se pudo guardar: choca con otro evento (solo puede haber uno en ejecución a la vez).',
  CONCURRENT_MODIFICATION: 'Otra persona cambió el evento. Recarga e inténtalo de nuevo.',
  INVALID_STATE_TRANSITION: 'El evento ya no admite esa acción en su estado actual.',
  EVENT_NOT_EDITABLE: 'Un evento Finalizado no se puede editar.',
  EVENT_NOT_ACTIVE: 'Solo se puede finalizar un evento en ejecución.',
  EXTERNAL_SERVICE_UNAVAILABLE: 'Un servicio del campus no respondió. Inténtalo en unos minutos.',
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

export const eventsApi = {
  search(session: Session, filters: { title?: string; status?: EventStatus | ''; page?: number; size?: number }) {
    const q = new URLSearchParams();
    if (filters.title?.trim()) q.set('title', filters.title.trim());
    if (filters.status) q.set('status', filters.status);
    q.set('page', String(filters.page ?? 0));
    q.set('size', String(filters.size ?? 20));
    return call<Page<EventSummary>>(`${BASE}?${q}`, session);
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
    throw new ApiError(0, 'No se encontró el tipo de evento en el catálogo. Intenta de nuevo más tarde.');
  }
  return found.id;
}
