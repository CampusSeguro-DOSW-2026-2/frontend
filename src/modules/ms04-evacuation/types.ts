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

/** Estado de un elemento del campus en MS02. */
export type EstadoMs02 = 'ACTIVO' | 'INACTIVO';

/** Zona segura de MS02 marcada como punto de encuentro (GET /api/v1/safe-zones?puntoEncuentro=true). */
export interface PuntoEncuentro {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion?: string;
  estado: EstadoMs02;
  puntoEncuentro?: boolean;
}

/** Edificio de MS02 (GET /api/v1/buildings). */
export interface Edificio {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoMs02;
}

/** Espacio de MS02 dentro de un edificio (GET /api/v1/buildings/{id}/spaces y GET /api/v1/spaces/{id}). */
export interface Espacio {
  id: string;
  edificioId: string;
  edificioNombre?: string;
  pisoNumero?: number;
  nombre: string;
  tipo?: string;
  estado: EstadoMs02;
}
