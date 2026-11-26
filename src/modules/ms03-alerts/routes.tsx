import type { ReactNode } from 'react';
import AlertList from './pages/AlertList';
import AlertForm from './pages/AlertForm';
import { alertAccess } from './permissions';
import type { Session } from '../../shared/types';
import { sessionPermissions } from '../../shared/services/session';
import { PERMISSION } from '../../shared/permissions';

/** Rutas de MS03. Devuelve undefined si la ruta no es de este módulo. */
export function alertRoutes(route: string, session: Session | null): ReactNode | undefined {
  const access = alertAccess(sessionPermissions(session));
  const denied = <main className="page"><p className="notice err" role="alert">No tiene permisos para ver esta sección.</p></main>;
  switch (route) {
    case '/alertas': return access.canReadHistory ? <AlertList /> : denied;
    // Crear exige ms03:alert:manage; editar, manage o manage_drill (el formulario afina según el origen de la alerta)
    case '/alertas/nueva': return access.canCreate ? <AlertForm key="new" /> : denied;
    default: {
      const m = route.match(/^\/alertas\/([^/]+)\/editar$/);
      if (!m) return undefined;
      const canEdit = access.canCreate || sessionPermissions(session).includes(PERMISSION.MS03_ALERT_MANAGE_DRILL);
      return canEdit ? <AlertForm key={m[1]} editId={m[1]} /> : denied;
    }
  }
}
