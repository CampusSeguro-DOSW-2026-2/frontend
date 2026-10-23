import { ms03 } from './http';

export type AlertStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'ARCHIVED';
export interface Scope { type: 'CAMPUS' | 'BUILDING' | 'ZONE'; ids?: string[] }
export interface Recipient { type: 'USER' | 'ROLE'; id: string }
export interface AlertSummary { id: string; type: string; title: string; scope: Scope; status: AlertStatus; origin: string; createdAt: string }
export interface Alert extends AlertSummary {
  eventId: string | null; instructions: string; recipients: Recipient[]; createdBy: string;
  updatedAt: string; activationAt: string | null; activatedAt: string | null; endedAt: string | null; archivedAt: string | null;
}
export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface AlertInput { type: 'EARTHQUAKE' | 'SIMULATION' | 'FIRE' | 'OTHER'; title: string; scope: Scope; instructions: string; recipients: Recipient[] }

const A = '/api/v1/alertas';
export const alertsApi = {
  list: (p: { status?: AlertStatus; page?: number; size?: number }) => {
    const q = new URLSearchParams();
    if (p.status) q.set('status', p.status);
    q.set('page', String(p.page ?? 0)); q.set('size', String(p.size ?? 10));
    return ms03<Page<AlertSummary>>('GET', `${A}?${q}`);
  },
  get: (id: string) => ms03<Alert>('GET', `${A}/${id}`),
  create: (b: AlertInput) => ms03<Alert>('POST', A, b),
  update: (id: string, b: Partial<AlertInput>) => ms03<Alert>('PUT', `${A}/${id}`, b),
  schedule: (id: string, activationAt: string) => ms03<Alert>('PUT', `${A}/${id}/programacion`, { activationAt }),
  activate: (id: string) => ms03<Alert>('PUT', `${A}/${id}/activacion`),
  end: (id: string) => ms03<Alert>('PUT', `${A}/${id}/finalizacion`),
  archive: (id: string) => ms03<Alert>('PUT', `${A}/${id}/archivado`),
};
