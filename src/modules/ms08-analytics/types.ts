/** Tipos de MS08 (Analítica y auditoría) tal como los usan las pantallas. */

export type AuditResult = 'EXITO' | 'FALLO';

/** Registro de auditoría (Estándares de Integración §12). Es de solo lectura: la colección es append-only. */
export interface AuditRecord {
  id: string;
  usuarioId: string | null;
  modulo: string;
  accion: string;
  recursoAfectado: string | null;
  resultado: AuditResult | string;
  /** ISO 8601 UTC. */
  fechaHora: string;
  correlationId: string;
  detalle: string | null;
  eventoId: string | null;
}

/** Filtros de la tabla de auditoría. Las fechas son días (AAAA-MM-DD) en hora de Bogotá. */
export interface AuditFilters {
  desde: string;
  hasta: string;
  modulo: string;
  accion: string;
  usuarioId: string;
  eventoId: string;
}

export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }

/** Un indicador del resumen: el valor puede ser un número, un texto o un desglose (estado → cantidad). */
export type IndicatorValue = number | string | boolean | null | Record<string, number>;

/** Resumen que MS08 calcula al finalizar un evento. `pendiente` = aún no hay cálculo. */
export interface EventIndicators {
  eventoId: string;
  pendiente: boolean;
  calculadoEn: string | null;
  tipoEvento: string | null;
  indicadores: Record<string, IndicatorValue>;
}
