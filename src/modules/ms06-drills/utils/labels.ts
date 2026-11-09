import { SCOPE_ITEMS } from '../../ms03-alerts/services/catalog';
import type { EventStatus, ParticipantRole, ScopeItem } from '../types';

export const STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En ejecución',
  FINISHED: 'Finalizado',
};

export const ROLE_LABEL: Record<ParticipantRole, string> = {
  ESTUDIANTE: 'Estudiantes',
  PROFESOR: 'Profesores',
  ADMINISTRATIVO: 'Personal administrativo',
  BRIGADISTA: 'Brigadistas',
};
export const PARTICIPANT_ROLES = Object.keys(ROLE_LABEL) as ParticipantRole[];

/** Edificios y zonas del catálogo de prueba (mismos ids que usa MS03). */
export const SCOPE_OPTIONS: ScopeItem[] = SCOPE_ITEMS
  .filter((i) => i.id !== 'CAMPUS')
  .map((i) => ({ type: i.id.startsWith('ZON') ? 'ZONE' : 'BUILDING', id: i.id }));

export const scopeLabel = (id: string) => SCOPE_ITEMS.find((i) => i.id === id)?.label ?? id;

export const CHECKIN_LABEL: Record<string, string> = {
  SAFE: 'En punto de encuentro',
  NOT_ON_CAMPUS: 'No está en el campus',
  NEEDS_HELP: 'Necesita ayuda',
};

/** MS06 envía los avisos en inglés; se muestran en español según su código. */
const WARNINGS: Record<string, string> = {
  NO_CHECKINS: 'Todavía no se han registrado check-ins.',
  NO_INCIDENTS: 'Todavía no se han registrado incidentes.',
  NO_BRIGADIERS: 'Todavía no hay brigadistas asignados.',
  NO_RECORDS: 'Todavía no hay check-ins, solicitudes de ayuda ni incidentes registrados.',
  SCOPE_PENDING: 'El catálogo del campus no respondió: el alcance quedó pendiente. Agrégalo después para programar el evento.',
  PARTICIPANTS_PENDING: 'El servicio de usuarios no respondió: los participantes quedaron pendientes. Agrégalos después.',
  EVALUATION_FAILED: 'El evento finalizó, pero no se pudieron guardar sus métricas generales.',
  EVALUATION_INCOMPLETE: 'Algunas cifras todavía no llegan de check-in o de brigadistas; se completan solas.',
  BRIGADIERS_NOT_SYNCED: 'El evento finalizó, pero no se pudo actualizar la lista final de brigadistas. Se conservó la última.',
  FINISH_ALERT_NOT_SENT: 'El evento finalizó, pero no se pudo avisar a los participantes porque el servicio de alertas no respondió.',
  ROUTES_UNAVAILABLE: 'Las rutas de evacuación no están disponibles en este momento.',
  CHECKIN_UNAVAILABLE: 'El monitoreo del check-in no está disponible: el servicio de check-in no responde.',
  INCIDENTS_UNAVAILABLE: 'El monitoreo de incidentes no está disponible: el servicio de brigadistas no responde.',
  START_PENDING_CHI: 'Al iniciar el evento no se pudo habilitar el check-in. El sistema sigue intentando.',
  START_PENDING_BEI: 'Al iniciar el evento no respondió el servicio de brigadistas e incidentes. El sistema sigue intentando.',
  START_PENDING_ALE: 'Al iniciar el evento no se pudo activar la alerta. El sistema sigue intentando.',
};
export const warningText = (w: { code: string; message: string }) =>
  WARNINGS[w.code] ?? (w.code.startsWith('START_PENDING_') ? 'Un servicio no respondió al iniciar el evento. El sistema sigue intentando.' : 'Hay un aviso sobre este evento.');

const MONTH =(d: Date) => d.toLocaleString('es-CO', { month: 'short' }).replace('.', '');
const TIME = (d: Date) => d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

/** "14 nov 2026 · 9:30 a. m." o el texto alterno si no hay fecha. */
export function formatDate(iso: string | null | undefined, empty = 'Sin fecha'): string {
  if (!iso) return empty;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return empty;
  return `${d.getDate()} ${MONTH(d)} ${d.getFullYear()} · ${TIME(d)}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

/** Valor del input datetime-local (hora local) a partir de un ISO, y al revés. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const fromLocalInput = (v: string): string | null => (v ? new Date(v).toISOString() : null);
