import type { ReactNode } from 'react';
import type { Session } from '../../shared/types';
import BrigadistaPanel from './pages/BrigadistaPanel';
import ElegirZona from './pages/ElegirZona';
import GestionBrigadistas from './pages/GestionBrigadistas';
import ReportarIncidente from './pages/ReportarIncidente';

const NO_ACCESS = <main className="page"><p className="notice err" role="alert">No tienes permisos para ver esta sección.</p></main>;

/** Rutas de MS05 (Brigadistas e incidentes). Devuelve undefined si la ruta no es de este módulo. */
export function brigadesRoutes(route: string, session: Session | null): ReactNode | undefined {
  const ours = route === '/ayuda' || route === '/brigadistas' || route === '/brigadista' || route.startsWith('/brigadista/');
  if (!session || !ours) return undefined;

  const roles = session.user.roles;
  const isBrigadista = roles.includes('BRIGADISTA');
  const isCoordination = roles.includes('COORDINADOR') || roles.includes('ORGANIZADOR');

  // Cualquier usuario de la comunidad puede pedir ayuda; el auditor no (RF-BEI-04)
  if (route === '/ayuda') return roles.includes('AUDITOR') && roles.length === 1 ? NO_ACCESS : <ReportarIncidente session={session} />;
  if (route === '/brigadistas') return isCoordination ? <GestionBrigadistas session={session} /> : NO_ACCESS;

  if (!isBrigadista) return NO_ACCESS;
  if (route === '/brigadista') return <BrigadistaPanel session={session} />;
  const zona = route.match(/^\/brigadista\/zona\/([^/]+)$/);
  if (zona) return <ElegirZona key={zona[1]} session={session} eventId={zona[1]} />;
  const rep = route.match(/^\/brigadista\/reportar\/([^/]+)$/);
  if (rep) return <ReportarIncidente key={rep[1]} session={session} eventId={rep[1]} forOther />;
  return undefined;
}
