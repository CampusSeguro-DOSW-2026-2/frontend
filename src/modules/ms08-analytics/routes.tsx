import type { ReactNode } from 'react';
import { PERMISSION } from '../../shared/permissions';
import { hasPermission } from '../../shared/services/session';
import type { Session } from '../../shared/types';
import Auditoria from './pages/Auditoria';
import Comparacion from './pages/Comparacion';
import Indicadores from './pages/Indicadores';
import Ubicaciones from './pages/Ubicaciones';
import { MAX_EVENTS, MIN_COMPARE } from './types';
import { isUuid } from './utils/format';

const NO_ACCESS = <main className="page"><p className="notice err" role="alert">No tiene permisos para ver esta sección.</p></main>;

/**
 * Permisos de MS08 que dan acceso a cada pantalla, leídos del claim `permissions` del JWT (nunca del rol). Basta uno
 * de los dos: MS08 devuelve solo los simulacros o los eventos reales que cada permiso permite ver.
 */
export const AUDIT_PERMISSIONS = [PERMISSION.MS08_AUDIT_DRILL_READ, PERMISSION.MS08_AUDIT_REAL_EVENT_READ];
export const INDICATORS_PERMISSIONS = [PERMISSION.MS08_INDICATORS_DRILL_READ, PERMISSION.MS08_INDICATORS_REAL_EVENT_READ];
/** Indicadores elige los eventos de la lista de MS06: hace falta también poder leer eventos (igual que el menú). */
export const EVENT_READ_PERMISSIONS = [PERMISSION.MS06_DRILL_READ, PERMISSION.MS06_REAL_EVENT_READ,
  PERMISSION.MS06_DRILL_MANAGE, PERMISSION.MS06_REAL_EVENT_MANAGE];

/** Rutas de MS08 (Analítica y auditoría). Devuelve undefined si la ruta no es de este módulo. */
export function analyticsRoutes(route: string, session: Session | null): ReactNode | undefined {
  if (!session) return undefined;

  if (route === '/auditoria') {
    return hasPermission(session, ...AUDIT_PERMISSIONS) ? <Auditoria session={session} /> : NO_ACCESS;
  }

  if (route === '/indicadores' || route.startsWith('/indicadores/')) {
    if (!hasPermission(session, ...INDICATORS_PERMISSIONS) || !hasPermission(session, ...EVENT_READ_PERMISSIONS)) return NO_ACCESS;
    const multi = route.match(/^\/indicadores\/(comparar|ubicaciones)\/([^/]+)$/);
    if (multi) {
      // Ids distintos y con formato UUID, hasta 10 (MS08 valida lo mismo)
      const ids = [...new Set(decodeURIComponent(multi[2]).split(',').map((id) => id.trim().toLowerCase()).filter(isUuid))].slice(0, MAX_EVENTS);
      const min = multi[1] === 'comparar' ? MIN_COMPARE : 1;
      if (ids.length < min) return <main className="page"><p className="notice err" role="alert">Seleccione {min === 1 ? 'al menos un evento' : `al menos ${min} eventos`} en <a href="#/indicadores">Indicadores</a>.</p></main>;
      return multi[1] === 'comparar'
        ? <Comparacion key={ids.join(',')} session={session} ids={ids} />
        : <Ubicaciones key={ids.join(',')} session={session} ids={ids} />;
    }
    const detail = route.match(/^\/indicadores\/([^/]+)$/);
    if (detail) return <Indicadores key={detail[1]} session={session} eventoId={decodeURIComponent(detail[1])} />;
    return route === '/indicadores' ? <Indicadores session={session} /> : undefined;
  }
  return undefined;
}
