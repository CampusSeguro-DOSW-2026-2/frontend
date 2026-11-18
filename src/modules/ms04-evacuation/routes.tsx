import type { ReactNode } from 'react';
import type { Session } from '../../shared/types';
import { PERMISSION } from '../../shared/permissions';
import { hasPermission } from '../../shared/services/session';
import EventosActivos from './pages/EventosActivos';
import ListaEventos from './pages/ListaEventos';
import ReporteEstado from './pages/ReporteEstado';

const SIN_ACCESO = <main className="page"><p className="notice err" role="alert">No tienes permisos para ver esta sección.</p></main>;

/** Rutas de MS04. Devuelve undefined si la ruta no es de este módulo. */
export function evacuationRoutes(route: string, session: Session | null): ReactNode | undefined {
  if (route === '/evacuacion/eventos') {
    if (!session) return undefined;
    // Events in any status (RF-MS04-13)
    if (!hasPermission(session, PERMISSION.MS04_DASHBOARD_READ)) {
      return SIN_ACCESO;
    }
    return <ListaEventos session={session} />;
  }
  const reporte = route.match(/^\/checkin\/([^/]+)$/);
  if ((route !== '/checkin' && !reporte) || !session) return undefined;
  // Report the own status
  if (!hasPermission(session, PERMISSION.MS04_CHECKIN_WRITE)) {
    return SIN_ACCESO;
  }
  if (reporte) {
    const eventoId = decodeURIComponent(reporte[1]);
    return <ReporteEstado key={eventoId} session={session} eventoId={eventoId} />;
  }
  return <EventosActivos session={session} />;
}
