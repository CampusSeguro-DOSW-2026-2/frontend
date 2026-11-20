import { useEffect, useState } from 'react';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { Navbar } from '../shared/components/Layout';
import { getSession, HOME_ROUTE, setSessionNotice, syncRememberedSession } from '../shared/services/session';
import { logoutUser } from '../modules/ms01-identity/services/identity';
import { PUBLIC_ROUTES, useIdentityRoutes } from '../modules/ms01-identity/routes';
import { useSessionGuard } from '../modules/ms01-identity/hooks/useSessionGuard';
import { campusRoutes, esRutaPublicaCampus } from '../modules/ms02-campus/routes';
import { alertRoutes } from '../modules/ms03-alerts/routes';
import { evacuationRoutes } from '../modules/ms04-evacuation/routes';
import { brigadesRoutes } from '../modules/ms05-brigades/routes';
import { drillsRoutes } from '../modules/ms06-drills/routes';
import { trainingRoutes } from '../modules/ms07-training/routes';
import { analyticsRoutes } from '../modules/ms08-analytics/routes';
import '../shared/styles.css';

// Router mínimo por hash para no añadir dependencias; sustituible por react-router.
const path = () => window.location.hash.replace(/^#/, '') || '/';

const NOT_IMPLEMENTED = <main className="page"><p className="notice">Esta sección aún no está implementada.</p></main>;

// Shell: sesión, barra de navegación y enrutado. Cada módulo (src/modules/msXX-*) declara sus rutas.
export default function App() {
  const [route, setRoute] = useState(path());
  const [session, setSession] = useState(getSession);
  const identityRoutes = useIdentityRoutes(session);
  // Cierra la sesión en cuanto el Gateway rechaza el token (cambio de roles, permisos o estado: RF-MS01-11)
  useSessionGuard(session, route);

  useEffect(() => {
    const onChange = () => { setRoute(path()); setSession(getSession()); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // Another tab started or closed the remembered session: this tab follows it
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (syncRememberedSession(event)) {
        setSession(getSession());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // With a valid session the login screen makes no sense: the root and the login route lead to the home screen
  useEffect(() => {
    if (session && (route === '/' || route === '/login')) {
      window.location.hash = HOME_ROUTE;
    }
  }, [session, route]);

  // Cerrar sesión desde el menú (RF-MS01-04).
  const logout = async () => {
    if (!session) return;
    setSessionNotice(await logoutUser(session));
    window.location.hash = '#/login';
  };

  const isPublic = PUBLIC_ROUTES.includes(route) || esRutaPublicaCampus(route);
  const blocked = !isPublic && !session;

  useEffect(() => {
    if (blocked) window.location.hash = '#/login';
  }, [blocked]);

  const page = blocked ? null
    : identityRoutes(route)
      ?? campusRoutes(route, session)
      ?? alertRoutes(route, session)
      ?? evacuationRoutes(route, session)
      ?? brigadesRoutes(route, session)
      ?? drillsRoutes(route, session)
      ?? trainingRoutes(route)
      ?? analyticsRoutes(route, session)
      ?? NOT_IMPLEMENTED;

  return (
    <>
      {!isPublic && <Navbar current={route} session={session} onLogout={logout} />}
      {/* Un error al mostrar una pantalla no deja en blanco la aplicación; al cambiar de ruta se reinicia */}
      <ErrorBoundary key={route}>{page}</ErrorBoundary>
      {/* Solo en desarrollo: acceso a las pantallas de prueba (la barra del mockup no tiene "Alertas"). */}
      {import.meta.env.DEV && <footer className="demo-nav">
        Vistas de demostración: <a href="#/login">Inicio de sesión</a> · <a href="#/registro">Registro</a> · <a href="#/recuperar-contrasena">Recuperar contraseña</a> · <a href="#/perfil">Perfil</a> · <a href="#/usuarios">Usuarios</a> · <a href="#/roles">Roles</a> · <a href="#/eventos">Eventos</a> · <a href="#/simulacro">Simulacro activo</a> · <a href="#/brigadista">Brigadista</a> · <a href="#/brigadistas">Gestión de brigadistas</a> · <a href="#/checkin">Reportar mi estado</a> · <a href="#/ayuda">Necesito ayuda</a> · <a href="#/alertas">Alertas</a>
      </footer>}
    </>
  );
}
