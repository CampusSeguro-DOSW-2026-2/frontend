import { ApiError, request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type {
  AuditFilters, AuditRecord, Bucket, ComparisonChange, ComparisonRow, EventIndicators, EventKind, IndicatorsResult, LocationRow, Page,
  SlowLocation, TimeStat,
} from '../types';
import { endOfDayUtc, startOfDayUtc } from '../utils/format';

/**
 * Cliente de MS08 (Analítica y auditoría). Todo pasa por el API Gateway, que enruta /api/v1/audit/** y
 * /api/v1/analytics/** a MS08. El front no filtra datos: MS08 devuelve solo lo que cada permiso permite
 * (simulacros, eventos reales o ambos) y responde 403 si se pide un evento de otro tipo.
 */
const AUDIT_PATH = '/api/v1/audit/events';
const indicatorsPath = (eventoId: string) => `/api/v1/analytics/events/${encodeURIComponent(eventoId)}`;
const COMPARISONS_PATH = '/api/v1/analytics/comparisons';
const LOCATIONS_PATH = '/api/v1/analytics/locations';

/** Filtro de la pantalla → parámetro de consulta de MS08. */
const AUDIT_PARAMS: Record<keyof AuditFilters, string> = {
  desde: 'desde', hasta: 'hasta', modulo: 'modulo', accion: 'accion', usuarioId: 'usuario_id', eventoId: 'evento_id',
  tipoEvento: 'tipo_evento',
};

/** Campo de un error 400 de MS08 → filtro de la pantalla, para marcarlo. */
const AUDIT_FIELDS: Record<string, string> = Object.fromEntries(Object.entries(AUDIT_PARAMS).map(([field, param]) => [param, field]));

export const PAGE_SIZE = 20;

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const obj = (v: unknown): Raw => (isObject(v) ? v : {});
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const list = <T>(v: unknown, map: (item: Raw) => T): T[] => (Array.isArray(v) ? v.filter(isObject).map(map) : []);
const kind = (v: unknown): EventKind | null => (v === 'SIMULACRO' || v === 'REAL' ? v : null);

/** Página estándar (Estándares §9): { contenido, page, size, total_elementos, total_paginas }. */
function toPage<T>(raw: unknown, map: (item: Raw) => T): Page<T> {
  const data = obj(raw);
  return {
    content: list(data.contenido, map),
    page: num(data.page),
    size: num(data.size) || PAGE_SIZE,
    totalElements: num(data.total_elementos),
    totalPages: num(data.total_paginas),
  };
}

const toAuditRecord = (r: Raw): AuditRecord => ({
  id: str(r.id) ?? '',
  usuarioId: str(r.usuario_id),
  modulo: str(r.modulo) ?? '—',
  accion: str(r.accion) ?? '—',
  recursoAfectado: str(r.recurso_afectado),
  resultado: str(r.resultado) ?? '—',
  fechaHora: str(r.fecha_hora) ?? '',
  correlationId: str(r.correlation_id) ?? '',
  detalle: str(r.detalle),
  eventoId: str(r.evento_id),
  tipoEvento: kind(r.tipo_evento),
});

const toBucket = (b: Raw): Bucket => ({ clave: str(b.clave) ?? '—', cantidad: num(b.cantidad), porcentaje: numOrNull(b.porcentaje) });
const toTime = (v: unknown): TimeStat => { const t = obj(v); return { promedioSegundos: numOrNull(t.promedio_segundos), muestras: num(t.muestras) }; };
const toSlow = (s: Raw): SlowLocation => ({
  ubicacionTipo: str(s.ubicacion_tipo) ?? '', ubicacionId: str(s.ubicacion_id) ?? '', promedioSegundos: num(s.promedio_segundos), muestras: num(s.muestras),
});

function toIndicators(eventoId: string, raw: unknown): EventIndicators {
  const d = obj(raw);
  const n = obj(d.notificacion);
  const p = obj(d.participacion);
  const i = obj(d.incidentes);
  const t = obj(d.tiempos);
  return {
    eventoId: str(d.evento_id) ?? eventoId,
    tipoEvento: kind(d.tipo_evento),
    calculadoEn: str(d.calculado_en),
    inicioEvento: str(d.inicio_evento),
    notificacion: {
      destinatarios: num(n.destinatarios), enviados: num(n.enviados), fallidos: num(n.fallidos), confirmados: num(n.confirmados),
      porcentajeConfirmacion: numOrNull(n.porcentaje_confirmacion),
    },
    participacion: {
      participantes: num(p.participantes),
      porcentajeParticipacion: numOrNull(p.porcentaje_participacion),
      porEstado: list(p.por_estado, toBucket),
      puntosEncuentro: list(p.puntos_encuentro, toBucket),
      solicitaronAsistencia: num(p.solicitaron_asistencia),
      porcentajeAsistencia: numOrNull(p.porcentaje_asistencia),
    },
    incidentes: { total: num(i.total), porCategoria: list(i.por_categoria, toBucket) },
    tiempos: {
      hastaCheckin: toTime(t.hasta_checkin),
      evacuacion: toTime(t.evacuacion),
      hastaPrimeraAtencion: toTime(t.hasta_primera_atencion),
      ubicacionesMasLentas: list(t.ubicaciones_mas_lentas, toSlow),
    },
  };
}

const toChange = (v: unknown): ComparisonChange | null => {
  if (!isObject(v)) return null;
  return {
    porcentajeParticipacion: numOrNull(v.porcentaje_participacion),
    porcentajeConfirmacion: numOrNull(v.porcentaje_confirmacion),
    hastaCheckinSegundos: numOrNull(v.hasta_checkin_segundos),
    evacuacionSegundos: numOrNull(v.evacuacion_segundos),
    hastaPrimeraAtencionSegundos: numOrNull(v.hasta_primera_atencion_segundos),
  };
};

const toComparisonRow = (r: Raw): ComparisonRow => ({
  eventoId: str(r.evento_id) ?? '',
  tipoEvento: kind(r.tipo_evento),
  inicioEvento: str(r.inicio_evento),
  participantes: num(r.participantes),
  porcentajeParticipacion: numOrNull(r.porcentaje_participacion),
  porcentajeConfirmacion: numOrNull(r.porcentaje_confirmacion),
  porcentajeAsistencia: numOrNull(r.porcentaje_asistencia),
  incidentes: num(r.incidentes),
  hastaCheckinSegundos: numOrNull(r.hasta_checkin_segundos),
  evacuacionSegundos: numOrNull(r.evacuacion_segundos),
  hastaPrimeraAtencionSegundos: numOrNull(r.hasta_primera_atencion_segundos),
  cambio: toChange(r.cambio_vs_anterior),
});

const toLocationRow = (l: Raw): LocationRow => ({
  ubicacionTipo: str(l.ubicacion_tipo) ?? '',
  ubicacionId: str(l.ubicacion_id) ?? '',
  incidentes: num(l.incidentes),
  solicitudesAsistencia: num(l.solicitudes_asistencia),
  hastaPrimeraAtencion: toTime(l.hasta_primera_atencion),
  porEvento: list(l.por_evento, (e) => ({
    eventoId: str(e.evento_id) ?? '', incidentes: num(e.incidentes), solicitudesAsistencia: num(e.solicitudes_asistencia),
    promedioSegundos: numOrNull(e.promedio_segundos), muestras: num(e.muestras),
  })),
});

/** Mensajes propios para las consultas de varios eventos, según la respuesta de MS08. */
const MULTI_MESSAGES: Record<number, string> = {
  400: 'Seleccione eventos distintos y del mismo tipo: todos simulacros o todos eventos reales.',
  403: 'No tiene permiso para ver los indicadores de alguno de los eventos seleccionados.',
  404: 'Los datos de alguno de los eventos seleccionados aún no han sido recopilados. Quítelo de la selección e intente de nuevo.',
};

/** Consulta de varios eventos: MS08 recibe `evento_id` repetido (?evento_id=a&evento_id=b). */
async function multiEvent(path: string, session: Session, eventoIds: string[]): Promise<unknown> {
  const q = new URLSearchParams();
  eventoIds.forEach((id) => q.append('evento_id', id.trim().toLowerCase()));
  try {
    return await request(`${path}?${q}`, { session });
  } catch (err) {
    if (err instanceof ApiError && MULTI_MESSAGES[err.status]) {
      throw new ApiError(err.status, MULTI_MESSAGES[err.status], {}, err.code, err.details, err.correlationId);
    }
    throw err;
  }
}

export const analyticsApi = {
  /** Registros de auditoría con filtros y paginación del servidor (más recientes primero). */
  async audit(session: Session, filters: AuditFilters, page: number, size = PAGE_SIZE): Promise<Page<AuditRecord>> {
    const q = new URLSearchParams();
    if (filters.desde) q.set(AUDIT_PARAMS.desde, startOfDayUtc(filters.desde));
    if (filters.hasta) q.set(AUDIT_PARAMS.hasta, endOfDayUtc(filters.hasta));
    if (filters.modulo) q.set(AUDIT_PARAMS.modulo, filters.modulo);
    if (filters.tipoEvento) q.set(AUDIT_PARAMS.tipoEvento, filters.tipoEvento);
    if (filters.accion.trim()) q.set(AUDIT_PARAMS.accion, filters.accion.trim().toUpperCase());
    if (filters.usuarioId.trim()) q.set(AUDIT_PARAMS.usuarioId, filters.usuarioId.trim().toLowerCase());
    if (filters.eventoId.trim()) q.set(AUDIT_PARAMS.eventoId, filters.eventoId.trim().toLowerCase());
    q.set('page', String(page));
    q.set('size', String(size));
    return toPage(await request(`${AUDIT_PATH}?${q}`, { session, fields: AUDIT_FIELDS }), toAuditRecord);
  },

  /**
   * Indicadores de un evento. MS08 los calcula en cada consulta; un 404 significa que todavía no recibió hechos
   * del evento y se muestra como pendiente de cálculo en lugar de error.
   */
  async indicators(session: Session, eventoId: string): Promise<IndicatorsResult> {
    try {
      return { pendiente: false, data: toIndicators(eventoId, await request(indicatorsPath(eventoId), { session })) };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return { pendiente: true };
      if (err instanceof ApiError && err.status === 403) {
        throw new ApiError(403, 'No tiene permiso para ver los indicadores de este tipo de evento.', {}, err.code, err.details, err.correlationId);
      }
      throw err;
    }
  },

  /** Comparación de 2 a 10 eventos del mismo tipo, del inicio más antiguo al más reciente. */
  async compare(session: Session, eventoIds: string[]): Promise<ComparisonRow[]> {
    return list(obj(await multiEvent(COMPARISONS_PATH, session, eventoIds)).eventos, toComparisonRow);
  },

  /** Incidentes, solicitudes de asistencia y tiempo de atención por edificio o zona, para 1 a 10 eventos. */
  async locations(session: Session, eventoIds: string[]): Promise<LocationRow[]> {
    return list(obj(await multiEvent(LOCATIONS_PATH, session, eventoIds)).ubicaciones, toLocationRow);
  },
};
