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
