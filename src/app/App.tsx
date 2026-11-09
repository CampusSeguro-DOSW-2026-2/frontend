import { useEffect, useState } from 'react';
import { Navbar } from '../shared/components/Layout';
import { getSession } from '../shared/services/session';
import { PUBLIC_ROUTES, useIdentityRoutes } from '../modules/ms01-identity/routes';
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

  useEffect(() => {
    const onChange = () => { setRoute(path()); setSession(getSession()); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const roles = session?.user.roles ?? [];
  const isPublic = PUBLIC_ROUTES.includes(route) || esRutaPublicaCampus(route);
  const blocked = !isPublic && !session;

  useEffect(() => {
    if (blocked) window.location.hash = '#/login';
  }, [blocked]);

  const page = blocked ? null
    : identityRoutes(route)
      ?? campusRoutes(route)
      ?? alertRoutes(route, session)
      ?? evacuationRoutes(route)
      ?? brigadesRoutes(route)
      ?? drillsRoutes(route)
      ?? trainingRoutes(route)
      ?? analyticsRoutes(route)
      ?? NOT_IMPLEMENTED;

  return (
    <>
      {!isPublic && <Navbar current={route} roles={roles} />}
      {page}
      {/* Solo en desarrollo: acceso a las pantallas de prueba (la barra del mockup no tiene "Alertas"). */}
      {import.meta.env.DEV && <footer className="demo-nav">
        Vistas de demostración: <a href="#/login">Inicio de sesión</a> · <a href="#/registro">Registro</a> · <a href="#/recuperar-contrasena">Recuperar contraseña</a> · <a href="#/perfil">Perfil</a> · <a href="#/usuarios">Usuarios</a> · <a href="#/roles">Roles</a> · <a href="#/crear-simulacro">Crear simulacro</a> · <a href="#/simulacro">Simulacro activo</a> · <a href="#/brigadista">Brigadista</a> · <a href="#/alertas">Alertas</a>
      </footer>}
    </>
  );
}
