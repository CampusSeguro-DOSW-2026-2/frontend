import { ApiError, request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type { AuditFilters, AuditRecord, EventIndicators, IndicatorValue, Page } from '../types';
import { endOfDayUtc, startOfDayUtc } from '../utils/format';

/**
 * Cliente de MS08 (Analítica y auditoría). Todo pasa por el API Gateway, que enruta /api/v1/auditoria/** y
 * /api/v1/analitica/** a MS08. El front no filtra datos: muestra lo que MS08 devuelve, y MS08 decide qué ve
 * cada permiso (eventos reales, simulacros o todo).
 *
 * CONTRATO PROVISIONAL: MS08 aún no publica su OpenAPI. Las rutas y los nombres de los parámetros están en las
 * constantes de abajo y las respuestas se leen tanto en snake_case como en camelCase, para ajustarlas en un solo
 * lugar cuando se publique el contrato.
 */
const AUDIT_PATH = '/api/v1/auditoria';
const indicatorsPath = (eventoId: string) => `/api/v1/analitica/eventos/${encodeURIComponent(eventoId)}/indicadores`;

/** Filtro de la pantalla → parámetro de consulta de MS08. */
const AUDIT_PARAMS = {
  desde: 'desde', hasta: 'hasta', modulo: 'modulo', accion: 'accion', usuarioId: 'usuario_id', eventoId: 'evento_id',
} as const;

export const PAGE_SIZE = 20;

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Primer valor presente entre varias claves (snake_case o camelCase). */
const pick = (raw: Raw, ...keys: string[]): unknown => keys.map((k) => raw[k]).find((v) => v !== undefined && v !== null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : typeof v === 'number' ? String(v) : null);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Página estándar (Estándares §9): { contenido, page, size, total_elementos, total_paginas }. */
function toPage<T>(raw: unknown, map: (item: Raw) => T): Page<T> {
  const data = isObject(raw) ? raw : {};
  const items = pick(data, 'contenido', 'content');
  return {
    content: Array.isArray(items) ? items.filter(isObject).map(map) : [],
    page: num(pick(data, 'page', 'number')),
    size: num(pick(data, 'size'), PAGE_SIZE),
    totalElements: num(pick(data, 'total_elementos', 'totalElements')),
    totalPages: num(pick(data, 'total_paginas', 'totalPages')),
  };
}

const toAuditRecord = (r: Raw): AuditRecord => ({
  id: str(pick(r, 'id', '_id')) ?? '',
  usuarioId: str(pick(r, 'usuario_id', 'usuarioId')),
  modulo: str(pick(r, 'modulo')) ?? '—',
  accion: str(pick(r, 'accion')) ?? '—',
  recursoAfectado: str(pick(r, 'recurso_afectado', 'recursoAfectado')),
  resultado: str(pick(r, 'resultado')) ?? '—',
  fechaHora: str(pick(r, 'fecha_hora', 'fechaHora')) ?? '',
  correlationId: str(pick(r, 'correlation_id', 'correlationId')) ?? '',
  detalle: str(pick(r, 'detalle')),
  eventoId: str(pick(r, 'evento_id', 'eventoId')),
});

function toIndicatorValue(v: unknown): IndicatorValue | undefined {
  if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (isObject(v) && Object.values(v).every((x) => typeof x === 'number')) return v as Record<string, number>;
  return undefined;
}

/** Claves del resumen que no son indicadores. */
const META_KEYS = new Set([
  'evento_id', 'eventoId', 'estado', 'calculado', 'pendiente', 'calculado_en', 'calculadoEn', 'fecha_calculo', 'fechaCalculo',
  'tipo_evento', 'tipoEvento', 'simulacro', 'indicadores', 'id', '_id', 'nombre_evento', 'nombreEvento',
]);

function toIndicators(eventoId: string, raw: unknown): EventIndicators {
  const data = isObject(raw) ? raw : {};
  // Los indicadores pueden venir agrupados en "indicadores" o sueltos en la raíz
  const source = isObject(data.indicadores) ? data.indicadores : data;
  const indicadores: Record<string, IndicatorValue> = {};
  for (const [key, value] of Object.entries(source)) {
    const parsed = toIndicatorValue(value);
    if (!META_KEYS.has(key) && parsed !== undefined) indicadores[key] = parsed;
  }
  const estado = str(pick(data, 'estado'))?.toUpperCase() ?? '';
  const pendiente = data.pendiente === true || data.calculado === false
    || ['PENDIENTE', 'PENDIENTE_CALCULO', 'EN_CALCULO', 'SIN_DATOS'].includes(estado)
    || Object.keys(indicadores).length === 0;
  const simulacro = pick(data, 'simulacro');
  return {
    eventoId: str(pick(data, 'evento_id', 'eventoId')) ?? eventoId,
    pendiente,
    calculadoEn: str(pick(data, 'calculado_en', 'calculadoEn', 'fecha_calculo', 'fechaCalculo')),
    tipoEvento: str(pick(data, 'tipo_evento', 'tipoEvento')) ?? (typeof simulacro === 'boolean' ? (simulacro ? 'SIMULACRO' : 'REAL') : null),
    indicadores,
  };
}

export const analyticsApi = {
  /** Registros de auditoría con filtros y paginación del servidor. */
  async audit(session: Session, filters: AuditFilters, page: number, size = PAGE_SIZE): Promise<Page<AuditRecord>> {
    const q = new URLSearchParams();
    if (filters.desde) q.set(AUDIT_PARAMS.desde, startOfDayUtc(filters.desde));
    if (filters.hasta) q.set(AUDIT_PARAMS.hasta, endOfDayUtc(filters.hasta));
    if (filters.modulo) q.set(AUDIT_PARAMS.modulo, filters.modulo);
    if (filters.accion.trim()) q.set(AUDIT_PARAMS.accion, filters.accion.trim().toUpperCase());
    if (filters.usuarioId.trim()) q.set(AUDIT_PARAMS.usuarioId, filters.usuarioId.trim().toLowerCase());
    if (filters.eventoId.trim()) q.set(AUDIT_PARAMS.eventoId, filters.eventoId.trim().toLowerCase());
    q.set('page', String(page));
    q.set('size', String(size));
    return toPage(await request(`${AUDIT_PATH}?${q}`, { session }), toAuditRecord);
  },

  /**
   * Resumen de indicadores de un evento. Un 404 significa que MS08 todavía no recibió los datos del evento:
   * se devuelve como pendiente de cálculo en lugar de error.
   */
  async indicators(session: Session, eventoId: string): Promise<EventIndicators> {
    try {
      return toIndicators(eventoId, await request(indicatorsPath(eventoId), { session }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return { eventoId, pendiente: true, calculadoEn: null, tipoEvento: null, indicadores: {} };
      }
      throw err;
    }
  },
};
