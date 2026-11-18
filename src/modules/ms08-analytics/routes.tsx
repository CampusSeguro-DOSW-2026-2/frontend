import type { ReactNode } from 'react';
import { PERMISSION } from '../../shared/permissions';
import { hasPermission } from '../../shared/services/session';
import type { Session } from '../../shared/types';
import Auditoria from './pages/Auditoria';
import Indicadores from './pages/Indicadores';

const NO_ACCESS = <main className="page"><p className="notice err" role="alert">No tiene permisos para ver esta sección.</p></main>;

/**
 * Permisos de MS08 que dan acceso a cada pantalla. Se leen del claim `permissions` del JWT, nunca del rol.
 * Cuando MS08 separe simulacros y eventos reales con permisos propios, se agregan aquí: la pantalla no filtra,
 * MS08 devuelve solo lo que el permiso permite.
 */
export const AUDIT_PERMISSIONS = [PERMISSION.MS08_AUDIT_READ];
export const INDICATORS_PERMISSIONS = [PERMISSION.MS08_INDICATORS_READ];

/** Rutas de MS08 (Analítica y auditoría). Devuelve undefined si la ruta no es de este módulo. */
export function analyticsRoutes(route: string, session: Session | null): ReactNode | undefined {
  if (!session) return undefined;

  if (route === '/auditoria') {
    return hasPermission(session, ...AUDIT_PERMISSIONS) ? <Auditoria session={session} /> : NO_ACCESS;
  }

  if (route === '/indicadores' || route.startsWith('/indicadores/')) {
    if (!hasPermission(session, ...INDICATORS_PERMISSIONS)) return NO_ACCESS;
    const detail = route.match(/^\/indicadores\/([^/]+)$/);
    if (detail) return <Indicadores key={detail[1]} session={session} eventoId={decodeURIComponent(detail[1])} />;
    return route === '/indicadores' ? <Indicadores session={session} /> : undefined;
  }
  return undefined;
}
