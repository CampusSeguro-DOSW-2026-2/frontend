import type { ReactNode } from 'react';
import type { Session } from '../../shared/types';
import { Mensaje } from '../../shared/components/Mensaje';
import { PERMISSION } from '../../shared/permissions';
import { hasPermission } from '../../shared/services/session';
import EventosActivos from './pages/EventosActivos';
import ListaEventos from './pages/ListaEventos';
import CentroEvento from './pages/CentroEvento';
import PanelEvento from './pages/PanelEvento';
import Inicio from './pages/Inicio';

const SIN_ACCESO = <main className="page"><Mensaje tono="error">No tiene permisos para ver esta sección.</Mensaje></main>;

/** Rutas de MS04. Devuelve undefined si la ruta no es de este módulo. */
export function evacuationRoutes(route: string, session: Session | null): ReactNode | undefined {
  // Pantalla de inicio: el evento o la alerta en curso, con el check-in (los accesos rápidos van en la barra de navegación)
  if (route === '/simulacro') return session ? <Inicio session={session} /> : undefined;
  if (route === '/evacuacion/eventos') {
    if (!session) return undefined;
    // Events in any status (RF-MS04-13)
    if (!hasPermission(session, PERMISSION.MS04_DASHBOARD_READ)) {
      return SIN_ACCESO;
    }
    return <ListaEventos session={session} />;
  }
  const panel = route.match(/^\/evacuacion\/eventos\/([^/]+)$/);
  if (panel) {
    if (!session) return undefined;
    // Panel del evento para el personal (RF-MS04-06 a RF-MS04-12)
    if (!hasPermission(session, PERMISSION.MS04_DASHBOARD_READ)) {
      return SIN_ACCESO;
    }
    const eventoId = decodeURIComponent(panel[1]);
    return <PanelEvento key={eventoId} session={session} eventoId={eventoId} />;
  }
  const reporte = route.match(/^\/checkin\/([^/]+)$/);
  if ((route !== '/checkin' && !reporte) || !session) return undefined;
  // Report the own status
  if (!hasPermission(session, PERMISSION.MS04_CHECKIN_WRITE)) {
    return SIN_ACCESO;
  }
  if (reporte) {
    const eventoId = decodeURIComponent(reporte[1]);
    return <CentroEvento key={eventoId} session={session} eventoId={eventoId} />;
  }
  return <EventosActivos session={session} />;
}
