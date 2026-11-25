import { PERMISSION } from '../../shared/permissions';
import type { AlertOrigin } from './services/alerts';

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

/**
 * Alert actions allowed by the permissions of the token (ms03:alert:*). The backend decides; this only avoids showing
 * actions that would answer 403.
 *
 * @param permissions permission codes of the session
 * @return what the session can do with alerts
 */
export function alertAccess(permissions: string[]): AlertAccess {
  const can = (code: string) => permissions.includes(code);
  const managesAll = can(PERMISSION.MS03_ALERT_MANAGE);
  const managesDrills = can(PERMISSION.MS03_ALERT_MANAGE_DRILL);
  return {
    canReadHistory: can(PERMISSION.MS03_ALERT_READ_HISTORY),
    canReceive: can(PERMISSION.MS03_ALERT_RECEIVE),
    canCreate: managesAll,
    canManage: (origin) => managesAll || (managesDrills && origin === 'SIMULATION'),
  };
}
