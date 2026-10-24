import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navbar } from './components/Layout';
import CreateSimulation from './pages/CreateSimulation';
import ActiveSimulation from './pages/ActiveSimulation';
import BrigadistaPanel from './pages/BrigadistaPanel';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Users from './pages/Users';
import ChangeStatus from './pages/ChangeStatus';
import { getSession } from './services/session';
import type { UserSummary } from './types';
import './styles.css';

// Router mínimo por hash para no añadir dependencias; sustituible por react-router.
const path = () => window.location.hash.replace(/^#/, '') || '/';

// Pantallas a pantalla completa, sin la barra de navegación principal
const FULL_SCREEN = ['/', '/login', '/registro'];

// Pantallas que exigen una sesión iniciada: sin ella se envía al inicio de sesión
const NEEDS_SESSION = ['/perfil', '/perfil/editar', '/usuarios', '/usuarios/estado'];

const NO_ACCESS = (
  <main className="page"><p className="notice err" role="alert">No tienes permisos para ver esta sección.</p></main>
);

export default function App() {
  const [route, setRoute] = useState(path());
  const [session, setSession] = useState(getSession);
  // Usuarios marcados en el listado (administrador) para cambiarles el estado
  const [selected, setSelected] = useState<UserSummary[]>([]);

  useEffect(() => {
    const onChange = () => { setRoute(path()); setSession(getSession()); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // Al cambiar de usuario no se arrastra la selección del anterior
  const userId = session?.user.id;
  useEffect(() => { setSelected([]); }, [userId]);

  const roles = session?.user.roles ?? [];
  const isAdmin = roles.includes('ADMIN');
  const canList = isAdmin || roles.includes('AUDITOR');
  const blocked = NEEDS_SESSION.includes(route) && !session;

  useEffect(() => {
    if (blocked) window.location.hash = '#/login';
  }, [blocked]);

  let page: ReactNode = null;
  if (!blocked) {
    switch (route) {
      case '/': case '/login': page = <Login />; break;
      case '/simulacro': page = <ActiveSimulation />; break;
      case '/crear-simulacro': page = <CreateSimulation />; break;
      case '/brigadista': page = <BrigadistaPanel />; break;
      case '/registro': page = <Register />; break;
      case '/perfil': page = session && <Profile session={session} />; break;
      case '/perfil/editar': page = session && <EditProfile session={session} />; break;
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
      default: page = <main className="page"><p className="notice">Esta sección aún no está implementada.</p></main>;
    }
  }

  return (
    <>
      {!FULL_SCREEN.includes(route) && <Navbar current={route} roles={roles} />}
      {page}
      <footer className="demo-nav">
        Vistas de demostración: <a href="#/login">Inicio de sesión</a> · <a href="#/registro">Registro</a> · <a href="#/perfil">Perfil</a> · <a href="#/usuarios">Usuarios</a> · <a href="#/crear-simulacro">Crear simulacro</a> · <a href="#/simulacro">Simulacro activo</a> · <a href="#/brigadista">Brigadista</a>
      </footer>
    </>
  );
}
