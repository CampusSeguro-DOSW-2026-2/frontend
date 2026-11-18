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

/** Nombres de los indicadores conocidos; los que no estén aquí se muestran con su clave legible. */
const INDICATOR_LABEL: Record<string, string> = {
  participantes_esperados: 'Participantes esperados',
  poblacion_objetivo: 'Población objetivo',
  total_checkins: 'Check-ins registrados',
  porcentaje_participacion: 'Participación en check-in',
  checkins_por_estado: 'Check-ins por estado',
  personas_a_salvo: 'Personas a salvo',
  personas_sin_reportar: 'Personas sin reportar',
  tiempo_promedio_evacuacion_segundos: 'Tiempo medio de evacuación',
  tiempo_total_segundos: 'Duración del evento',
  duracion_segundos: 'Duración del evento',
  total_incidentes: 'Incidentes',
  incidentes_atendidos: 'Incidentes atendidos',
  incidentes_resueltos: 'Incidentes resueltos',
  incidentes_pendientes: 'Incidentes pendientes',
  tiempo_promedio_atencion_segundos: 'Tiempo medio de atención',
  brigadistas_activos: 'Brigadistas activos',
  alertas_enviadas: 'Alertas enviadas',
  alertas_entregadas: 'Alertas entregadas',
  porcentaje_entrega_alertas: 'Entrega de alertas',
};

const STATE_LABEL: Record<string, string> = {
  A_SALVO: 'A salvo', SAFE: 'A salvo', EN_RIESGO: 'En riesgo', AT_RISK: 'En riesgo', NECESITA_AYUDA: 'Necesita ayuda',
  NEEDS_HELP: 'Necesita ayuda', SIN_REPORTE: 'Sin reporte', NO_REPORT: 'Sin reporte',
};

/** "porcentajeParticipacion" o "porcentaje_participacion" → clave en snake_case. */
export const snakeCase = (key: string): string => key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

export function indicatorLabel(key: string): string {
  const snake = snakeCase(key);
  if (INDICATOR_LABEL[snake]) return INDICATOR_LABEL[snake];
  const text = snake.replace(/_segundos$/, '').replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const stateLabel = (key: string): string => STATE_LABEL[key.toUpperCase()] ?? key.replace(/_/g, ' ').toLowerCase();

/** Valor de un indicador numérico según su clave: porcentaje, duración o cantidad. */
export function formatIndicator(key: string, value: number): string {
  const snake = snakeCase(key);
  if (snake.startsWith('porcentaje') || snake.endsWith('_pct') || snake.endsWith('_porcentaje')) {
    return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
  }
  if (snake.endsWith('_segundos') || snake.endsWith('_seconds')) return formatDuration(value);
  return value.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}
