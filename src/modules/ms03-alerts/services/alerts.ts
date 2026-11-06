import { ms03 } from './ms03';

// Ciclo de vida de MS03: DRAFT → SCHEDULED → ACTIVE → ARCHIVED (se puede pasar de DRAFT a ACTIVE y archivar desde cualquier estado).
export type AlertStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ARCHIVED';
// OPERATIVA es exclusiva: no se combina con otros tipos ni se usa en simulacros.
export type AlertType = 'EARTHQUAKE' | 'FIRE' | 'OTHER' | 'OPERATIVA';
export type AlertOrigin = 'MANUAL' | 'SIMULATION';
export interface Scope { type: 'CAMPUS' | 'BUILDING' | 'ZONE'; ids?: string[] }
// USER lleva el UUID del usuario; ROLE, uno de los roles oficiales (ESTUDIANTE, PROFESOR, ...).
export interface Recipient { type: 'USER' | 'ROLE'; id: string }
export interface AlertSummary {
  id: string; types: AlertType[]; title: string; scope: Scope; status: AlertStatus; origin: AlertOrigin; simulationId: string | null;
  createdAt: string; instructions: string; recipients: Recipient[];
}
export interface Alert extends AlertSummary {
  createdBy: string; updatedAt: string; activationAt: string | null; activatedAt: string | null; archivedAt: string | null;
}
// Alerta tal como la ve su destinatario en la bandeja (GET /alertas/mias)
export interface InboxAlert {
  id: string; types: AlertType[]; title: string; status: AlertStatus; origin: AlertOrigin; scope: Scope; instructions: string;
  activatedAt: string | null; archivedAt: string | null; confirmedAt: string | null;
}
export type InboxStatus = 'ACTIVE' | 'ARCHIVED' | 'ALL';
export interface Confirmation { id: string; idAlerta: string; usuarioId: string; fechaConfirmacion: string }

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
// La paginación de MS03 usa nombres en español: contenido, total_elementos y total_paginas.
interface PageDto<T> { contenido: T[]; page: number; size: number; total_elementos: number; total_paginas: number }
function toPage<T>(p: PageDto<T>): Page<T> {
  return { content: p.contenido, page: p.page, size: p.size, totalElements: p.total_elementos, totalPages: p.total_paginas };
}

export interface AlertInput { types: AlertType[]; title: string; scope: Scope; instructions: string; recipients: Recipient[] }
// En la creación: activationAt programa la alerta; activateImmediately la emite. Son excluyentes.
export interface AlertCreateInput extends AlertInput { activationAt?: string; activateImmediately?: boolean }

const A = '/api/v1/alertas';
export const alertsApi = {
  // `types` se repite en la consulta y se evalúa con OR: alertas con al menos uno de los tipos.
  list: (p: { status?: AlertStatus; types?: AlertType[]; page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (p.status) q.set('status', p.status);
    p.types?.forEach((t) => q.append('type', t));
    q.set('page', String(p.page ?? 0)); q.set('size', String(p.size ?? 10));
    return ms03<PageDto<AlertSummary>>('GET', `${A}?${q}`).then(toPage);
  },
  // Bandeja personal: por defecto solo alertas ACTIVE. Requiere el permiso de recibir alertas.
  inbox: (p: { status?: InboxStatus; page?: number; size?: number } = {}) => {
    const q = new URLSearchParams({ page: String(p.page ?? 0), size: String(p.size ?? 20) });
    if (p.status) q.set('status', p.status);
    return ms03<PageDto<InboxAlert>>('GET', `${A}/mias?${q}`).then(toPage);
  },
  get: (id: string) => ms03<Alert>('GET', `${A}/${id}`),
  create: (b: AlertCreateInput) => ms03<Alert>('POST', A, b),
  update: (id: string, b: Partial<AlertInput>) => ms03<Alert>('PUT', `${A}/${id}`, b),
  schedule: (id: string, activationAt: string) => ms03<Alert>('PATCH', `${A}/${id}/programar`, { activationAt }),
  activate: (id: string) => ms03<Alert>('PATCH', `${A}/${id}/activar`),
  archive: (id: string) => ms03<Alert>('PATCH', `${A}/${id}/archivar`),
  // 201 la primera vez; un reintento del mismo usuario devuelve 200 con la confirmación existente.
  confirm: (id: string) => ms03<Confirmation>('POST', `${A}/${id}/confirmaciones`),
};
