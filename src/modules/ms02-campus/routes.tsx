import { Mensaje } from '../../shared/components/Mensaje';
import type { ReactNode } from 'react';
import BuildingDetail from './pages/BuildingDetail';
import BuildingsAdmin from './pages/BuildingsAdmin';
import CampusAdmin from './pages/CampusAdmin';
import EdificiosEstudiante from './pages/EdificiosEstudiante';
import HojaQr from './pages/HojaQr';
import HojaQrZonas from './pages/HojaQrZonas';
import PreventiveAdmin from './pages/PreventiveAdmin';
import QrPublico, { type TipoQr } from './pages/QrPublico';
import RouteQuery from './pages/RouteQuery';
import RoutesAdmin from './pages/RoutesAdmin';
import ZonesAdmin from './pages/ZonesAdmin';
import { NavegacionAdmin } from './components/NavegacionAdmin';
import type { Session } from '../../shared/types';
import { PERMISSION } from '../../shared/permissions';
import { hasPermission } from '../../shared/services/session';

const SIN_ACCESO = <main className="page"><Mensaje tono="error">No tiene permisos para ver esta sección.</Mensaje></main>;

/** Permisos que abren la administración del campus: cualquiera de escritura de MS02 (Matriz Rol–Permiso). */
const PERMISOS_ADMIN = [
  PERMISSION.MS02_BUILDING_WRITE, PERMISSION.MS02_SPACE_WRITE, PERMISSION.MS02_SAFE_ZONE_WRITE,
  PERMISSION.MS02_ROUTE_WRITE, PERMISSION.MS02_ROUTE_STATUS_WRITE, PERMISSION.MS02_QR_MANAGE,
];

const RUTA_QR = /^\/qr\/(espacios|salidas|zonas)\/([^/]+)$/;

/** Pantallas que abren los códigos QR: se ven sin sesión. */
export const esRutaPublicaCampus = (route: string) => RUTA_QR.test(route);

/**
 * Rutas de MS02. Devuelve undefined si la ruta no es de este módulo. Cada pantalla se abre según los permisos del
 * token (nunca por el nombre del rol); las de QR público no exigen sesión.
 */
export function campusRoutes(route: string, session: Session | null): ReactNode | undefined {
  const pagina = paginaCampus(route);
  if (pagina === undefined || esRutaPublicaCampus(route)) return pagina;
  if (!session) return undefined;
  const permitido = route.startsWith('/admin/')
    ? hasPermission(session, ...PERMISOS_ADMIN)
    : route === '/rutas'
      ? hasPermission(session, PERMISSION.MS02_ROUTE_READ)
      : hasPermission(session, PERMISSION.MS02_CAMPUS_READ);
  if (!permitido) return SIN_ACCESO;
  // Las pantallas de administración llevan las pestañas; las hojas de QR (para imprimir) no.
  if (!route.startsWith('/admin/') || route.endsWith('/qr')) return pagina;
  return <><NavegacionAdmin ruta={route} />{pagina}</>;
}

function paginaCampus(route: string): ReactNode | undefined {
  switch (route) {
    case '/edificios': return <EdificiosEstudiante />;
    case '/rutas': return <RouteQuery />;
    case '/admin/edificios': return <BuildingsAdmin />;
    case '/admin/zonas': return <ZonesAdmin />;
    case '/admin/zonas/qr': return <HojaQrZonas />;
    case '/admin/campus': return <CampusAdmin />;
    case '/admin/rutas': return <RoutesAdmin />;
    case '/admin/preventiva': return <PreventiveAdmin />;
    default: {
      const edificioConsulta = route.match(/^\/edificios\/([^/]+)$/);
      if (edificioConsulta) {
        return <EdificiosEstudiante key={edificioConsulta[1]} edificioId={edificioConsulta[1]} />;
      }
      const qr = route.match(RUTA_QR);
      if (qr) return <QrPublico key={route} tipo={qr[1] as TipoQr} id={qr[2]} />;
      const hojaZona = route.match(/^\/admin\/zonas\/([^/]+)\/qr$/);
      if (hojaZona) return <HojaQrZonas key={hojaZona[1]} zonaId={hojaZona[1]} />;
      const hoja = route.match(/^\/admin\/edificios\/([^/]+)\/qr$/);
      if (hoja) return <HojaQr key={hoja[1]} edificioId={hoja[1]} />;
      const m = route.match(/^\/admin\/edificios\/([^/]+)$/);
      return m ? <BuildingDetail key={m[1]} edificioId={m[1]} /> : undefined;
    }
  }
}
