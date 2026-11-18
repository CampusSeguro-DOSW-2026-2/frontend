import type { ReactNode } from 'react';
import { hasPermission } from '../../shared/services/session';
import type { Session } from '../../shared/types';
import AdminEvaluaciones from './pages/AdminEvaluaciones';
import Evaluaciones from './pages/Evaluaciones';
import PresentarEvaluacion from './pages/PresentarEvaluacion';

/** Permisos de MS07 (Matriz Rol‐Permiso): la interfaz decide qué mostrar por permiso, nunca por rol. */
export const PERMISOS_MS07 = {
  presentar: 'ms07:quiz:take',
  administrar: 'ms07:content:manage',
} as const;

const SIN_ACCESO = <main className="page"><p className="notice err" role="alert">No tienes permisos para ver esta sección.</p></main>;

/** Rutas de MS07. Devuelve undefined si la ruta no es de este módulo. */
export function trainingRoutes(route: string, session: Session | null): ReactNode | undefined {
  if (!session) return undefined;
  if (route === '/admin/evaluaciones') {
    return hasPermission(session, PERMISOS_MS07.administrar) ? <AdminEvaluaciones session={session} /> : SIN_ACCESO;
  }
  if (route === '/evaluaciones') {
    return hasPermission(session, PERMISOS_MS07.presentar) ? <Evaluaciones session={session} /> : SIN_ACCESO;
  }
  const presentar = route.match(/^\/evaluaciones\/([^/]+)$/);
  if (presentar) {
    const id = decodeURIComponent(presentar[1]);
    return hasPermission(session, PERMISOS_MS07.presentar)
      ? <PresentarEvaluacion key={id} session={session} id={id} />
      : SIN_ACCESO;
  }
  return undefined;
}
