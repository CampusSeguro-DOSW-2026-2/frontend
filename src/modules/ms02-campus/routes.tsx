import type { ReactNode } from 'react';
import BuildingDetail from './pages/BuildingDetail';
import BuildingsAdmin from './pages/BuildingsAdmin';
import CampusAdmin from './pages/CampusAdmin';
import HojaQr from './pages/HojaQr';
import PreventiveAdmin from './pages/PreventiveAdmin';
import QrPublico, { type TipoQr } from './pages/QrPublico';
import RouteQuery from './pages/RouteQuery';
import RoutesAdmin from './pages/RoutesAdmin';
import ZonesAdmin from './pages/ZonesAdmin';

const RUTA_QR = /^\/qr\/(espacios|salidas|zonas)\/([^/]+)$/;

/** Pantallas que abren los códigos QR: se ven sin sesión. */
export const esRutaPublicaCampus = (route: string) => RUTA_QR.test(route);

/** Rutas de MS02. Devuelve undefined si la ruta no es de este módulo. */
export function campusRoutes(route: string): ReactNode | undefined {
  switch (route) {
    case '/rutas': return <RouteQuery />;
    case '/admin/edificios': return <BuildingsAdmin />;
    case '/admin/zonas': return <ZonesAdmin />;
    case '/admin/campus': return <CampusAdmin />;
    case '/admin/rutas': return <RoutesAdmin />;
    case '/admin/preventiva': return <PreventiveAdmin />;
    default: {
      const qr = route.match(RUTA_QR);
      if (qr) return <QrPublico key={route} tipo={qr[1] as TipoQr} id={qr[2]} />;
      const hoja = route.match(/^\/admin\/edificios\/([^/]+)\/qr$/);
      if (hoja) return <HojaQr key={hoja[1]} edificioId={hoja[1]} />;
      const m = route.match(/^\/admin\/edificios\/([^/]+)$/);
      return m ? <BuildingDetail key={m[1]} edificioId={m[1]} /> : undefined;
    }
  }
}
