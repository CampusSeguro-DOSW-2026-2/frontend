// Contrato de MS06 (Eventos), rama develop. Fechas en ISO-8601 (UTC).

export type EventStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED';
export type ScopeType = 'BUILDING' | 'ZONE';
export type ParticipantRole = 'ESTUDIANTE' | 'PROFESOR' | 'ADMINISTRATIVO' | 'BRIGADISTA';

export interface ScopeItem { type: ScopeType; id: string }
export interface EventWarning { code: string; message: string }
export interface EventType { id: string; code: string; name: string; active: boolean }

export interface EventSummary {
  id: string;
  name: string;
  status: EventStatus;
  simulacro: boolean;
  startDate: string | null;
  startedAt: string | null;
  endedAt: string | null;
  types: string[];
  scope: ScopeItem[];
  participantRoles: ParticipantRole[];
  createdBy: string;
}

export interface EventData {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
  simulacro: boolean;
  startDate: string | null;
  startedAt: string | null;
  endedAt: string | null;
  types: EventType[];
  scope: ScopeItem[];
  participantRoles: ParticipantRole[];
  alerts: { purpose: string; alertId: string }[];
  createdBy: string;
  createdAt: string;
  warnings: EventWarning[];
}

export interface Monitoring {
  checkIn: { updatedAt: string | null; totalCheckins: number; byStatus: Record<string, number>; participationPct: number | null } | null;
  incidents: { updatedAt: string | null; totalIncidents: number; attended: number; resolved: number; pending: number; avgAttentionSeconds: number | null } | null;
  brigadiersByZone: { zoneId: string; activeCount: number; brigadiers: { brigadierId: string; name: string; active: boolean }[] }[];
  brigadiersSyncedAt: string | null;
  messages: EventWarning[];
}

export interface Evaluation {
  eventId: string;
  evaluatedAt: string | null;
  complete: boolean;
  noRecords: boolean;
  totalCheckins: number | null;
  checkinParticipationPct: number | null;
  checkInByStatus: Record<string, number> | null;
  totalIncidents: number | null;
  casesAttended: number | null;
  casesResolved: number | null;
  avgAttentionSeconds: number | null;
  brigadiers: { brigadierId: string; casesAttended: number; casesResolved: number }[];
}

export interface EventDetail { event: EventData; monitoring: Monitoring | null; evaluation: Evaluation | null }

export interface EventFinish {
  id: string; name: string; status: EventStatus; startedAt: string | null; endedAt: string | null;
  evaluation: Evaluation | null; warnings: EventWarning[];
}

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }

/** Cuerpo de crear y editar (PUT reemplaza el evento completo). */
export interface EventInput {
  name: string;
  description: string | null;
  typeIds: string[];
  startDate: string | null;
  scope: ScopeItem[];
  participantRoles: ParticipantRole[];
}
