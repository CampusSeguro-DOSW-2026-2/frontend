import type { ReactNode } from 'react';
import type { Session } from '../../shared/types';
import { PERMISSION } from '../../shared/permissions';
import { hasPermission } from '../../shared/services/session';
import BrigadistaPanel from './pages/BrigadistaPanel';
import AutoAsignacion from './pages/AutoAsignacion';
import GestionBrigadistas from './pages/GestionBrigadistas';
import ReportarIncidente from './pages/ReportarIncidente';
import MisIncidentes from './pages/MisIncidentes';
import PanelRespuesta from './pages/PanelRespuesta';
import AtenderIncidente from './pages/AtenderIncidente';

const NO_ACCESS = <main className="page"><p className="notice err" role="alert">No tiene permisos para ver esta sección.</p></main>;

/** Rutas de MS05 (Brigadistas e incidentes). Devuelve undefined si la ruta no es de este módulo. */
export function brigadesRoutes(route: string, session: Session | null): ReactNode | undefined {
  const ours = route === '/ayuda' || route === '/mis-incidentes' || route === '/brigadistas' || route === '/brigadista' || route.startsWith('/brigadista/');
  if (!session || !ours) return undefined;

  // Ask for help: report an incident that affects the own user (RF-BEI-04)
  if (route === '/ayuda') {
    if (!hasPermission(session, PERMISSION.MS05_INCIDENT_REPORT)) {
      return NO_ACCESS;
    }
    return <ReportarIncidente session={session} />;
  }

  // My incidents: the requests the user reported (ms05:incident:manage_own)
  if (route === '/mis-incidentes') {
    if (!hasPermission(session, PERMISSION.MS05_INCIDENT_MANAGE_OWN)) {
      return NO_ACCESS;
    }
    return <MisIncidentes session={session} />;
  }

  // Brigade management of events: real events and drills have their own permission
  if (route === '/brigadistas') {
    if (!hasPermission(session, PERMISSION.MS05_BRIGADIER_ASSIGN_TO_REAL, PERMISSION.MS05_BRIGADIER_ASSIGN_TO_DRILL)) {
      return NO_ACCESS;
    }
    return <GestionBrigadistas session={session} />;
  }

  // Report an incident for another person
  const rep = route.match(/^\/brigadista\/reportar\/([^/]+)$/);
  if (rep) {
    if (!hasPermission(session, PERMISSION.MS05_ASSISTANCE_REGISTER)) {
      return NO_ACCESS;
    }
    return <ReportarIncidente key={rep[1]} session={session} eventId={rep[1]} forOther />;
  }

  if (!hasPermission(session, PERMISSION.MS05_PANEL_READ_OWN)) {
    return NO_ACCESS;
  }
  if (route === '/brigadista') return <BrigadistaPanel session={session} />;
  // Official response panel: incidents of the running events, one drop-down per event
  if (route === '/brigadista/incidentes') return <PanelRespuesta session={session} />;
  const atender = route.match(/^\/brigadista\/incidentes\/([^/]+)\/([^/]+)$/);
  if (atender) {
    const [eventoId, incidenteId] = [decodeURIComponent(atender[1]), decodeURIComponent(atender[2])];
    return <AtenderIncidente key={incidenteId} session={session} eventoId={eventoId} incidenteId={incidenteId} />;
  }
  // Auto asignación (RF-BEI-01, opción 2): desde el menú o desde el enlace del aviso del evento
  if (route === '/brigadista/autoasignacion') return <AutoAsignacion session={session} />;
  const auto = route.match(/^\/brigadista\/(?:autoasignacion|zona)\/([^/]+)$/);
  if (auto) return <AutoAsignacion key={auto[1]} session={session} eventId={auto[1]} />;
  return undefined;
}
