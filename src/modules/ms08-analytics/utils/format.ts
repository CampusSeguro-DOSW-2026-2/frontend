/**
 * Fechas de MS08: el servicio trabaja en UTC y la pantalla muestra la hora de Bogotá (UTC-5, sin horario de verano),
 * igual que Eventos. Los filtros de fecha son días de Bogotá convertidos a instantes UTC.
 */
export const TIME_ZONE = 'America/Bogota';
const BOGOTA_OFFSET = '-05:00';

const DAY = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit' });

/** "14 nov 2026 · 9:30:12 a. m." (como en Eventos) en hora de Bogotá, o el texto alterno si no hay fecha. */
export function formatBogota(iso: string | null | undefined, empty = 'Sin fecha'): string {
  if (!iso) return empty;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return empty;
  const part = (type: string) => DAY.formatToParts(d).find((p) => p.type === type)?.value ?? '';
  return `${part('day')} ${part('month').replace('.', '')} ${part('year')} · ${TIME.format(d)}`;
}

/** Primer instante del día de Bogotá, en ISO UTC (2026-11-14 → 2026-11-14T05:00:00.000Z). */
export const startOfDayUtc = (day: string): string => new Date(`${day}T00:00:00${BOGOTA_OFFSET}`).toISOString();

/** Último instante del día de Bogotá, en ISO UTC (el filtro "hasta" incluye el día completo). */
export const endOfDayUtc = (day: string): string => new Date(`${day}T23:59:59.999${BOGOTA_OFFSET}`).toISOString();

/** Hoy en Bogotá como AAAA-MM-DD (tope de los selectores de fecha). */
export const todayInBogota = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string): boolean => UUID.test(value.trim());

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min`;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

/** Microservicios que emiten auditoría (campo `modulo`). */
export const MODULES: { id: string; label: string }[] = [
  { id: 'MS01', label: 'MS01 · Identidad y acceso' },
  { id: 'MS02', label: 'MS02 · Campus y seguridad' },
  { id: 'MS03', label: 'MS03 · Alertas y emergencias' },
  { id: 'MS04', label: 'MS04 · Evacuación y check-in' },
  { id: 'MS05', label: 'MS05 · Brigadistas e incidentes' },
  { id: 'MS06', label: 'MS06 · Simulacros y eventos' },
  { id: 'MS07', label: 'MS07 · Capacitación y asistente' },
  { id: 'MS08', label: 'MS08 · Analítica y auditoría' },
];

export const RESULT_LABEL: Record<string, string> = { EXITO: 'Éxito', FALLO: 'Fallo' };
export const KIND_LABEL: Record<string, string> = { SIMULACRO: 'Simulacro', REAL: 'Evento real' };

/** Claves de los desgloses de MS08 (estado de check-in, prioridad, sin dato) en español. */
const BUCKET_LABEL: Record<string, string> = {
  SAFE: 'A salvo', A_SALVO: 'A salvo', NEEDS_ASSISTANCE: 'Necesita asistencia', NECESITA_AYUDA: 'Necesita ayuda',
  OFF_CAMPUS: 'Fuera del campus', NOT_ON_CAMPUS: 'Fuera del campus', NEEDS_HELP: 'Necesita ayuda', EVACUATING: 'Evacuando',
  SIN_ESTADO: 'Sin estado', SIN_PUNTO: 'Sin punto de encuentro', SIN_PRIORIDAD: 'Sin prioridad',
  ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja', CRITICA: 'Crítica',
};

export function bucketLabel(key: string): string {
  if (BUCKET_LABEL[key.toUpperCase()]) return BUCKET_LABEL[key.toUpperCase()];
  // Solo los códigos (MAYÚSCULAS_CON_GUION_BAJO) se vuelven legibles; los nombres (un punto de encuentro) quedan igual
  if (!/^[A-Z0-9_]+$/.test(key)) return key;
  const text = key.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const formatCount = (value: number): string => value.toLocaleString('es-CO');

/** Porcentaje de 0 a 100 con un decimal; "—" si MS08 no tuvo con qué calcularlo. */
export const formatPercent = (value: number | null): string =>
  (value == null ? '—' : `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`);

/** Tiempo promedio en segundos; "—" si no hay muestras. */
export const formatSeconds = (value: number | null): string => (value == null ? '—' : formatDuration(value));
