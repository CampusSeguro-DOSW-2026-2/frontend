import type { ReactNode } from 'react';
import AlertList from './pages/AlertList';
import AlertForm from './pages/AlertForm';
import ActiveSimulation from './pages/ActiveSimulation';
import { alertAccess } from './permissions';
import type { Session } from '../../shared/types';

/** Rutas de MS03. Devuelve undefined si la ruta no es de este módulo. */
export function alertRoutes(route: string, session: Session | null): ReactNode | undefined {
  const access = alertAccess(session?.user.roles ?? []);
  const denied = <main className="page"><p className="notice" role="alert">No cuentas con permisos para ver esta sección.</p></main>;
  switch (route) {
    case '/simulacro': return session && <ActiveSimulation />;
    case '/alertas': return access.canReadHistory ? <AlertList /> : denied;
    case '/alertas/nueva': return <AlertForm key="new" />;
    default: {
      const m = route.match(/^\/alertas\/([^/]+)\/editar$/);
      return m ? <AlertForm key={m[1]} editId={m[1]} /> : undefined;
    }
  }
}
