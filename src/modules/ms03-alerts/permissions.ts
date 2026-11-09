import type { AlertOrigin } from './services/alerts';

/**
 * Permisos de MS03 según los roles oficiales de MS01 (matriz del backend, ms03:alert:*):
 * - COORDINADOR: recibe, administra todas las alertas y consulta el historial.
 * - ORGANIZADOR: recibe, consulta el historial y administra solo alertas de simulacro.
 * - AUDITOR: solo consulta el historial.
 * - ESTUDIANTE, PROFESOR, ADMINISTRATIVO y BRIGADISTA: solo reciben alertas.
 * - ADMIN: sin permisos en MS03.
 * El backend es quien decide; esto solo evita mostrar acciones que responderían 403.
 */
const RECEIVE = ['ESTUDIANTE', 'PROFESOR', 'ADMINISTRATIVO', 'BRIGADISTA', 'COORDINADOR', 'ORGANIZADOR'];
const HISTORY = ['COORDINADOR', 'ORGANIZADOR', 'AUDITOR'];

export interface AlertAccess {
  /** Ve el listado de todas las alertas. */
  canReadHistory: boolean;
  /** Recibe alertas: tiene bandeja personal y puede confirmar recepción. */
  canReceive: boolean;
  /** Crea alertas manuales (las de simulacro las crea MS06). */
  canCreate: boolean;
  /** Edita, programa, activa o archiva una alerta de ese origen. */
  canManage: (origin: AlertOrigin) => boolean;
}

export function alertAccess(roles: string[]): AlertAccess {
  const has = (r: string) => roles.includes(r);
  const coordinator = has('COORDINADOR');
  return {
    canReadHistory: roles.some((r) => HISTORY.includes(r)),
    canReceive: roles.some((r) => RECEIVE.includes(r)),
    canCreate: coordinator,
    canManage: (origin) => coordinator || (has('ORGANIZADOR') && origin === 'SIMULATION'),
  };
}
