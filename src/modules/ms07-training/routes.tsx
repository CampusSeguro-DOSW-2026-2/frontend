import { Mensaje } from '../../shared/components/Mensaje';
import type { ReactNode } from 'react';
import { hasPermission } from '../../shared/services/session';
import type { Session } from '../../shared/types';
import AdminContenidos from './pages/AdminContenidos';
import AdminEvaluaciones from './pages/AdminEvaluaciones';
import Aprendizaje from './pages/Aprendizaje';
import ContenidoDetalle from './pages/ContenidoDetalle';
import Evaluaciones from './pages/Evaluaciones';
import MiProgreso from './pages/MiProgreso';
import PresentarEvaluacion from './pages/PresentarEvaluacion';
import Tutor from './pages/Tutor';

/** Permisos de MS07 (Matriz Rol‐Permiso): la interfaz decide qué mostrar por permiso, nunca por rol. */
export const PERMISOS_MS07 = {
  leer: 'ms07:content:read',
  presentar: 'ms07:quiz:take',
  tutor: 'ms07:tutor:use',
  administrar: 'ms07:content:manage',
} as const;

const SIN_ACCESO = <main className="page"><Mensaje tono="error">No tiene permisos para ver esta sección.</Mensaje></main>;

/** Rutas de MS07. Devuelve undefined si la ruta no es de este módulo. */
export function trainingRoutes(route: string, session: Session | null): ReactNode | undefined {
  if (!session) return undefined;
  if (route === '/admin/evaluaciones') {
    return hasPermission(session, PERMISOS_MS07.administrar) ? <AdminEvaluaciones session={session} /> : SIN_ACCESO;
  }
  if (route === '/admin/aprendizaje') {
    return hasPermission(session, PERMISOS_MS07.administrar) ? <AdminContenidos session={session} /> : SIN_ACCESO;
  }
  // Contenidos: los lee la comunidad (content:read) y también quien administra
  if (route === '/aprendizaje') {
    return hasPermission(session, PERMISOS_MS07.leer, PERMISOS_MS07.administrar)
      ? <Aprendizaje session={session} />
      : SIN_ACCESO;
  }
  const contenido = route.match(/^\/aprendizaje\/([^/]+)$/);
  if (contenido) {
    const id = decodeURIComponent(contenido[1]);
    return hasPermission(session, PERMISOS_MS07.leer, PERMISOS_MS07.administrar)
      ? <ContenidoDetalle key={id} session={session} id={id} />
      : SIN_ACCESO;
  }
  // Tutor CampusSeguro (RF-15): solo la comunidad; el ADMIN gestiona contenidos pero no usa el tutor
  if (route === '/tutor') {
    return hasPermission(session, PERMISOS_MS07.tutor) ? <Tutor session={session} /> : SIN_ACCESO;
  }
  if (route === '/mi-progreso') {
    return hasPermission(session, PERMISOS_MS07.presentar) ? <MiProgreso session={session} /> : SIN_ACCESO;
  }
  if (route === '/evaluaciones') {
    return hasPermission(session, PERMISOS_MS07.presentar) ? <Evaluaciones session={session} /> : SIN_ACCESO;
  }
  const presentar = route.match(/^\/evaluaciones\/([^/]+)$/);
  if (presentar) {
    const id = decodeURIComponent(presentar[1]);
    return hasPermission(session, PERMISOS_MS07.presentar)
      ? <PresentarEvaluacion key={id} session={session} id={id} />
      : SIN_ACCESO;
  }
  return undefined;
}
