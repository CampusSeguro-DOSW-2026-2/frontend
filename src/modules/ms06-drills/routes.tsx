import type { ReactNode } from 'react';
import type { Session } from '../../shared/types';
import { PERMISSION } from '../../shared/permissions';
import { hasPermission } from '../../shared/services/session';
import EventList from './pages/EventList';
import EventForm from './pages/EventForm';
import EventDetail from './pages/EventDetail';

const NO_ACCESS = <main className="page"><p className="notice err" role="alert">No tiene permisos para ver esta sección.</p></main>;

/** Rutas de MS06 (Eventos). Devuelve undefined si la ruta no es de este módulo. */
export function drillsRoutes(route: string, session: Session | null): ReactNode | undefined {
  if (!session || !(route === '/eventos' || route.startsWith('/eventos/') || route === '/crear-simulacro')) return undefined;

  const canManage = hasPermission(session, PERMISSION.MS06_DRILL_MANAGE, PERMISSION.MS06_REAL_EVENT_MANAGE);
  const canView = canManage || hasPermission(session, PERMISSION.MS06_DRILL_READ, PERMISSION.MS06_REAL_EVENT_READ);
  if (!canView) return NO_ACCESS;

  if (route === '/eventos') return <EventList session={session} canManage={canManage} />;
  if (route === '/eventos/nuevo' || route === '/crear-simulacro') return canManage ? <EventForm key="new" session={session} /> : NO_ACCESS;

  const edit = route.match(/^\/eventos\/([^/]+)\/editar$/);
  if (edit) return canManage ? <EventForm key={edit[1]} session={session} editId={edit[1]} /> : NO_ACCESS;

  const detail = route.match(/^\/eventos\/([^/]+)$/);
  if (detail) return <EventDetail key={detail[1]} session={session} id={detail[1]} />;
  return undefined;
}
