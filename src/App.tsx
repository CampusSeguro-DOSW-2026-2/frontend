import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navbar } from './components/Layout';
import CreateSimulation from './pages/CreateSimulation';
import ActiveSimulation from './pages/ActiveSimulation';
import BrigadistaPanel from './pages/BrigadistaPanel';
import RouteQuery from './pages/campus/RouteQuery';
import BuildingDetail from './pages/campus/BuildingDetail';
import RoutesAdmin from './pages/campus/RoutesAdmin';
import PreventiveAdmin from './pages/campus/PreventiveAdmin';
import BuildingsAdmin from './pages/campus/BuildingsAdmin';
import ZonesAdmin from './pages/campus/ZonesAdmin';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Users from './pages/Users';
import ChangeStatus from './pages/ChangeStatus';
import Roles from './pages/Roles';
import ChangeRoles from './pages/ChangeRoles';
import { getSession } from './services/session';
import type { UserSummary } from './types';
import './styles.css';

// Router mínimo por hash para no añadir dependencias; sustituible por react-router.
const path = () => window.location.hash.replace(/^#/, '') || '/';

// Pantallas públicas: inicio de sesión, registro y recuperación de contraseña. Se muestran a pantalla
// completa, sin la barra de navegación principal. Todas las demás exigen una sesión iniciada; sin ella se
// envía al inicio de sesión
const PUBLIC = ['/', '/login', '/registro', '/recuperar-contrasena', '/cambiar-contrasena'];

const NO_ACCESS = (
  <main className="page"><p className="notice err" role="alert">No tienes permisos para ver esta sección.</p></main>
);

export default function App() {
  const [route, setRoute] = useState(path());
  const [session, setSession] = useState(getSession);
  // Usuarios marcados en el listado (administrador) para cambiarles el estado
  const [selected, setSelected] = useState<UserSummary[]>([]);
  // Usuarios marcados en el listado de roles (administrador); se descartan al cambiar de usuario
  const [roleSelection, setRoleSelection] = useState<{ owner?: string; users: UserSummary[] }>({ users: [] });

  useEffect(() => {
    const onChange = () => { setRoute(path()); setSession(getSession()); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // Al cambiar de usuario no se arrastra la selección del anterior
  const userId = session?.user.id;
  useEffect(() => { setSelected([]); }, [userId]);

  const roleSelected = roleSelection.owner === userId ? roleSelection.users : [];
  const setRoleSelected = (users: UserSummary[]) => setRoleSelection({ owner: userId, users });

  const roles = session?.user.roles ?? [];
  const isAdmin = roles.includes('ADMIN');
  const canList = isAdmin || roles.includes('AUDITOR');
  const blocked = !PUBLIC.includes(route) && !session;

  useEffect(() => {
    if (blocked) window.location.hash = '#/login';
  }, [blocked]);

  const edificio = route.match(/^\/admin\/edificios\/([^/]+)$/);

  let page: ReactNode = null;
  if (!blocked) {
    switch (route) {
      case '/': case '/login': page = <Login />; break;
      case '/simulacro': page = session && <ActiveSimulation session={session} />; break;
      case '/crear-simulacro': page = <CreateSimulation />; break;
      case '/brigadista': page = <BrigadistaPanel />; break;
      case '/rutas': page = <RouteQuery />; break;
      case '/admin/rutas': page = <RoutesAdmin />; break;
      case '/admin/preventiva': page = <PreventiveAdmin />; break;
      case '/admin/edificios': page = <BuildingsAdmin />; break;
      case '/admin/zonas': page = <ZonesAdmin />; break;
      case '/registro': page = <Register />; break;
      case '/recuperar-contrasena': page = <ForgotPassword />; break;
      case '/cambiar-contrasena': page = <ResetPassword />; break;
      case '/perfil': page = session && <Profile session={session} />; break;
      case '/perfil/editar': page = session && <EditProfile session={session} />; break;
      case '/perfil/contrasena': page = session && <ChangePassword session={session} />; break;
      case '/usuarios':
        page = session && (canList
          ? <Users session={session} selected={selected} onSelectedChange={setSelected} />
          : NO_ACCESS);
        break;
      case '/usuarios/estado':
        page = session && (isAdmin
          ? <ChangeStatus session={session} selected={selected} onSelectedChange={setSelected} />
          : NO_ACCESS);
        break;
      case '/roles':
        page = session && (isAdmin
          ? <Roles session={session} selected={roleSelected} onSelectedChange={setRoleSelected} />
          : NO_ACCESS);
        break;
      case '/roles/editar':
        page = session && (isAdmin
          ? <ChangeRoles session={session} selected={roleSelected} onSelectedChange={setRoleSelected} />
          : NO_ACCESS);
        break;
      default: page = edificio
        ? <BuildingDetail key={edificio[1]} edificioId={edificio[1]} />
        : <main className="page"><p className="notice">Esta sección aún no está implementada.</p></main>;
    }
  }

  return (
    <>
      {!PUBLIC.includes(route) && <Navbar current={route} roles={roles} />}
      {page}
      <footer className="demo-nav">
        Vistas de demostración: <a href="#/login">Inicio de sesión</a> · <a href="#/registro">Registro</a> · <a href="#/recuperar-contrasena">Recuperar contraseña</a> · <a href="#/perfil">Perfil</a> · <a href="#/usuarios">Usuarios</a> · <a href="#/roles">Roles</a> · <a href="#/crear-simulacro">Crear simulacro</a> · <a href="#/simulacro">Simulacro activo</a> · <a href="#/brigadista">Brigadista</a>
      </footer>
    </>
  );
}
