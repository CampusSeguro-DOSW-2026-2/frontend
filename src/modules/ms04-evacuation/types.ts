/**
 * Tipos del contrato de MS04 (Evacuación y check-in). Los nombres de los campos son los del JSON que responde
 * MS04 a través del API Gateway (snake_case en las rutas protegidas).
 */

/** Estado del evento que MS06 le informa a MS04. El check-in solo está habilitado EN_EJECUCION (RN-MS04-19). */
export type EstadoEvento = 'BORRADOR' | 'PROGRAMADO' | 'EN_EJECUCION' | 'FINALIZADO';

/** Edificios y zonas del evento: texto informativo que envía MS06; no limita a quién le aplica (RN-MS04-24). */
export interface Escenario {
  edificios: string[];
  zonas: string[];
}

/** Evento tal como lo responde MS04 (GET /api/v1/chi/eventos/activos, RF-MS04-01). */
export interface Evento {
  evento_id: string;
  nombre: string;
  /** true: simulacro; false: emergencia real */
  simulacro: boolean;
  estado: EstadoEvento;
  /** ISO 8601; null solo en BORRADOR */
  fecha_inicio: string | null;
  /** ISO 8601; solo en FINALIZADO */
  fecha_cierre: string | null;
  escenario: Escenario;
  roles_convocados: string[];
  checkin_habilitado: boolean;
}

/** Los cuatro estados del check-in (RN-MS04-03). El texto que ve el usuario está en utils/labels.ts. */
export type EstadoCheckin = 'SAFE' | 'EVACUATING' | 'NEEDS_ASSISTANCE' | 'OFF_CAMPUS';

/** Tipo de lugar de MS02 donde se requiere la asistencia (RN-MS04-09). */
export type TipoUbicacion = 'EDIFICIO' | 'ESPACIO' | 'PUNTO_ENCUENTRO';

/** Estado del envío de la solicitud de asistencia a MS05 (RN-MS04-10). */
export type EstadoEnvio = 'ENVIADA' | 'PENDIENTE_ENVIO' | 'RECHAZADA';

export interface Ubicacion {
  tipo: TipoUbicacion;
  id: string;
}

export interface SolicitudAsistencia {
  /** Id de la solicitud en MS05; null mientras no haya llegado */
  id: string | null;
  estado_envio: EstadoEnvio;
}

/** Check-in tal como lo responde MS04 (registro, actualización y estado vigente). */
export interface Checkin {
  id: string;
  evento_id: string;
  estado: EstadoCheckin;
  /** Solo con SAFE */
  punto_encuentro_id: string | null;
  /** Solo con NEEDS_ASSISTANCE */
  ubicacion: Ubicacion | null;
  /** Solo con NEEDS_ASSISTANCE */
  solicitud_asistencia: SolicitudAsistencia | null;
  /** Fecha y hora de registro, ISO 8601 */
  fecha_hora: string;
}

/**
 * Cuerpo del reporte (F-01). Solo se envían los campos del estado elegido (RG-05) y nunca la identidad del usuario,
 * que llega por el token (RN-MS04-06).
 */
export interface CheckinRequest {
  estado: EstadoCheckin;
  punto_encuentro_id?: string;
  ubicacion?: Ubicacion;
}

/** Página de la lista de eventos (RF-MS04-13): paginación de los Estándares, con `page` desde 0. */
export interface EventoPage {
  contenido: Evento[];
  page: number;
  size: number;
  total_elementos: number;
  total_paginas: number;
}

/** Zona segura o punto de encuentro de MS02 (GET /api/v1/safe-zones). */
export interface PuntoEncuentro {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion?: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

/** Edificio de MS02 (GET /api/v1/buildings), solo lo que usa la ubicación de Requiero asistencia. */
export interface Edificio {
  id: string;
  nombre: string;
}

/** Página de los listados del panel (Estándares): `page` desde 0. */
export interface Pagina<T> {
  contenido: T[];
  page: number;
  size: number;
  total_elementos: number;
  total_paginas: number;
}

/** Personas por estado vigente, con las cuatro claves siempre presentes (RF-MS04-06). */
export type TotalesPorEstado = Record<EstadoCheckin, number>;

export interface TotalPorPunto {
  punto_encuentro_id: string;
  total: number;
}

/** Consolidado del evento (GET /consolidado, RF-MS04-06). */
export interface Consolidado {
  evento_id: string;
  estado_evento: EstadoEvento;
  total_reportados: number;
  totales_por_estado: TotalesPorEstado;
  por_punto_encuentro: TotalPorPunto[];
  calculado_en: string;
}

/** Estado vigente de una persona (GET /personas); `nombre` y `correo` son null si MS01 no respondió. */
export interface CheckinResumen {
  usuario_id: string;
  nombre: string | null;
  correo: string | null;
  estado: EstadoCheckin;
  punto_encuentro_id: string | null;
  fecha_hora: string;
}

/** Persona convocada que todavía no reporta (GET /pendientes, RF-MS04-07). */
export interface Pendiente {
  usuario_id: string;
  nombre: string | null;
  correo: string | null;
}

/** Persona que requiere asistencia (GET /asistencia, RF-MS04-08). */
export interface PersonaAsistencia {
  usuario_id: string;
  nombre: string | null;
  correo: string | null;
  ubicacion: Ubicacion;
  fecha_reporte: string;
  solicitud_asistencia: SolicitudAsistencia;
}

/** Cambio de estado del histórico (GET /historial, RF-MS04-10). */
export interface RegistroHistorial {
  checkin_id: string;
  usuario_id: string;
  nombre: string | null;
  correo: string | null;
  estado: EstadoCheckin;
  punto_encuentro_id: string | null;
  ubicacion: Ubicacion | null;
  registrado_en: string;
}

/** Resultados del evento (GET /resultados, RF-MS04-12); `finales` es false mientras no esté FINALIZADO. */
export interface Resultados {
  evento_id: string;
  simulacro: boolean;
  estado_evento: EstadoEvento;
  fecha_inicio: string | null;
  fecha_cierre: string | null;
  finales: boolean;
  poblacion_objetivo: number | null;
  total_reportados: number;
  total_pendientes: number | null;
  totales_por_estado: TotalesPorEstado;
  por_punto_encuentro: TotalPorPunto[];
  solicitudes_asistencia: { usuario_id: string; solicitud_asistencia: SolicitudAsistencia }[];
  primeros_checkins: { usuario_id: string; primer_checkin_en: string }[];
}
