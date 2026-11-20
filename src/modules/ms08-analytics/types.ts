/** Tipos de MS08 (Analítica y auditoría) tal como los usan las pantallas. */

export type AuditResult = 'EXITO' | 'FALLO';
/** Tipo de evento al que pertenece un registro; decide qué permiso hace falta para verlo. */
export type EventKind = 'SIMULACRO' | 'REAL';

/** Registro de auditoría (Estándares de Integración §12). Es de solo lectura: la colección es append-only. */
export interface AuditRecord {
  id: string;
  usuarioId: string | null;
  modulo: string;
  accion: string;
  recursoAfectado: string | null;
  resultado: AuditResult | string;
  /** Momento de la acción, ISO 8601 UTC. */
  fechaHora: string;
  correlationId: string;
  detalle: string | null;
  eventoId: string | null;
  /** null = registro administrativo (sin evento), por ejemplo un inicio de sesión. */
  tipoEvento: EventKind | null;
}

/** Filtros de la tabla de auditoría. Las fechas son días (AAAA-MM-DD) en hora de Bogotá. */
export interface AuditFilters {
  desde: string;
  hasta: string;
  modulo: string;
  accion: string;
  usuarioId: string;
  eventoId: string;
  tipoEvento: EventKind | '';
  correlationId: string;
}

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }

/** Grupo de un conteo con su porcentaje sobre el total del grupo. */
export interface Bucket { clave: string; cantidad: number; porcentaje: number | null }
/** Tiempo promedio en segundos (null si no hay muestras) y cuántas muestras lo forman. */
export interface TimeStat { promedioSegundos: number | null; muestras: number }
export interface SlowLocation { ubicacionTipo: string; ubicacionId: string; promedioSegundos: number; muestras: number }

/**
 * Indicadores que MS08 calcula para un evento a partir de los hechos auditados (GET /api/v1/analytics/events/{id}).
 * Los porcentajes van de 0 a 100 y son null cuando no hay con qué dividir.
 */
export interface EventIndicators {
  eventoId: string;
  tipoEvento: EventKind | null;
  calculadoEn: string | null;
  inicioEvento: string | null;
  notificacion: { destinatarios: number; enviados: number; fallidos: number; confirmados: number; porcentajeConfirmacion: number | null };
  participacion: {
    participantes: number;
    porcentajeParticipacion: number | null;
    porEstado: Bucket[];
    puntosEncuentro: Bucket[];
    solicitaronAsistencia: number;
    porcentajeAsistencia: number | null;
  };
  incidentes: { total: number; porCategoria: Bucket[] };
  tiempos: { hastaCheckin: TimeStat; evacuacion: TimeStat; hastaPrimeraAtencion: TimeStat; ubicacionesMasLentas: SlowLocation[] };
}

/** Resultado de pedir los indicadores: el resumen, o pendiente de cálculo si MS08 aún no tiene datos del evento. */
export type IndicatorsResult = { pendiente: true } | { pendiente: false; data: EventIndicators };
