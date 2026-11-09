import type { ReactNode } from 'react';
import type { Session } from '../../shared/types';
import EventList from './pages/EventList';
import EventForm from './pages/EventForm';
import EventDetail from './pages/EventDetail';

const NO_ACCESS = <main className="page"><p className="notice err" role="alert">No tienes permisos para ver esta sección.</p></main>;

/** Rutas de MS06 (Eventos). Devuelve undefined si la ruta no es de este módulo. */
export function drillsRoutes(route: string, session: Session | null): ReactNode | undefined {
  if (!session || !(route === '/eventos' || route.startsWith('/eventos/') || route === '/crear-simulacro')) return undefined;

  const roles = session.user.roles;
  const canManage = roles.includes('COORDINADOR') || roles.includes('ORGANIZADOR');
  const canView = canManage || roles.includes('ADMIN') || roles.includes('AUDITOR');
  if (!canView) return NO_ACCESS;

  if (route === '/eventos') return <EventList session={session} canManage={canManage} />;
  if (route === '/eventos/nuevo' || route === '/crear-simulacro') return canManage ? <EventForm key="new" session={session} /> : NO_ACCESS;

  const edit = route.match(/^\/eventos\/([^/]+)\/editar$/);
  if (edit) return canManage ? <EventForm key={edit[1]} session={session} editId={edit[1]} /> : NO_ACCESS;

  const detail = route.match(/^\/eventos\/([^/]+)$/);
  if (detail) return <EventDetail key={detail[1]} session={session} id={detail[1]} canManage={canManage} />;
  return undefined;
}
