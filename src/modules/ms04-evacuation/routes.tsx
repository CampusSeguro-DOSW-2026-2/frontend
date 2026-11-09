import type { ReactNode } from 'react';
import type { Session } from '../../shared/types';
import EventosActivos from './pages/EventosActivos';
import ReporteEstado from './pages/ReporteEstado';

/** Roles que reportan su propio estado (ms04:checkin:write). ADMIN y AUDITOR no tienen permisos de check-in. */
const COMUNIDAD = ['ESTUDIANTE', 'PROFESOR', 'ADMINISTRATIVO', 'BRIGADISTA', 'COORDINADOR', 'ORGANIZADOR'];

const SIN_ACCESO = <main className="page"><p className="notice err" role="alert">No tienes permisos para ver esta sección.</p></main>;

/** Rutas de MS04. Devuelve undefined si la ruta no es de este módulo. */
export function evacuationRoutes(route: string, session: Session | null): ReactNode | undefined {
  const reporte = route.match(/^\/checkin\/([^/]+)$/);
  if ((route !== '/checkin' && !reporte) || !session) return undefined;
  if (!session.user.roles.some((rol) => COMUNIDAD.includes(rol))) return SIN_ACCESO;
  if (reporte) {
    const eventoId = decodeURIComponent(reporte[1]);
    return <ReporteEstado key={eventoId} session={session} eventoId={eventoId} />;
  }
  return <EventosActivos session={session} />;
}
