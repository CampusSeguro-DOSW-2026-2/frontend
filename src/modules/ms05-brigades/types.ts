// Contrato de MS05 (Brigadistas e incidentes), rama develop.

export type TipoUbicacion = 'EDIFICIO' | 'ZONA_SEGURA' | 'PUNTO_ENCUENTRO';
export type EstadoBrigadista = 'ACTIVO' | 'INACTIVO';

/** Ids del catálogo prioridad_incidente (BIGSERIAL en el orden en que se insertan). */
export const PRIORIDADES = [
  { id: 1, codigo: 'EMERGENCIA', label: 'Emergencia', help: 'Riesgo para la vida o lesión grave' },
  { id: 2, codigo: 'URGENCIA_MODERADA', label: 'Urgencia moderada', help: 'Necesito ayuda pronto' },
  { id: 3, codigo: 'POCA_URGENCIA', label: 'Poca urgencia', help: 'Puedo esperar' },
] as const;

export interface Asignacion {
  idAsignacion: string;
  brigadistaId: string;
  eventoId: string;
  ubicacionId: string;
  tipoUbicacion: TipoUbicacion;
  estado: 'VIGENTE' | 'RETIRADA';
  observaciones: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface ActivacionResponse { idActivacion: string; brigadistaId: string; estado: EstadoBrigadista; fechaCambioEstado: string }

export interface BrigadistaEncontrado {
  idBrigadista: string;
  nombre: string;
  rol: string;
  estado: EstadoBrigadista;
  asignaciones: { idAsignacion: string; eventoId: string; ubicacionId: string; tipoUbicacion: TipoUbicacion; estado: string }[];
}
export interface BusquedaBrigadistas { mensaje: string; resultados: BrigadistaEncontrado[] }

export interface Incidente {
  idIncidente: string;
  eventoId: string;
  nombreAfectado: string;
  reportanteId: string;
  ubicacionId: string;
  tipoUbicacion: TipoUbicacion;
  prioridad: string;
  estado: string;
  descripcion: string | null;
  fechaReporte: string;
}

export interface NuevoIncidente {
  nombreAfectado?: string;
  prioridadId: number;
  ubicacionId: string;
  tipoUbicacion: TipoUbicacion;
  descripcion?: string;
}

export interface Evidencia { id: string; nombreArchivo: string; tipoContenido: string; referenciaArchivo: string; fechaCarga: string }

/** Estados de un incidente en MS05: REPORTADO → ASIGNADO → EN_ATENCION → RESUELTO → CERRADO. */
export type EstadoIncidente = 'REPORTADO' | 'ASIGNADO' | 'EN_ATENCION' | 'RESUELTO' | 'CERRADO';

/** Un incidente del listado de MS05 (GET /api/v1/incidentes/eventos/{eventoId}/consulta). */
export interface IncidenteResumen {
  incidenteId: string;
  eventoId: string;
  zonaId: string;
  tipoUbicacion: TipoUbicacion;
  prioridad: string;
  estado: EstadoIncidente | string;
  brigadistaResponsableId: string | null;
  reportadoEn: string;
}

/** Página con el formato de los Estándares (§9). */
export interface Pagina<T> { contenido: T[]; page: number; size: number; total_elementos: number; total_paginas: number }
