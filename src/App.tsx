import { useEffect, useState } from 'react';
import { Navbar } from './components/Layout';
import CreateSimulation from './pages/CreateSimulation';
import ActiveSimulation from './pages/ActiveSimulation';
import BrigadistaPanel from './pages/BrigadistaPanel';
import Register from './pages/Register';
import Login from './pages/Login';
import './styles.css';

// Router mínimo por hash para no añadir dependencias; sustituible por react-router.
const path = () => window.location.hash.replace(/^#/, '') || '/';

// Pantallas a pantalla completa, sin la barra de navegación principal
const FULL_SCREEN = ['/', '/login', '/registro'];

export default function App() {
  const [route, setRoute] = useState(path());
  useEffect(() => { const f = () => setRoute(path()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);

  let page;
  switch (route) {
    case '/': case '/login': page = <Login />; break;
    case '/simulacro': page = <ActiveSimulation />; break;
    case '/crear-simulacro': page = <CreateSimulation />; break;
    case '/brigadista': page = <BrigadistaPanel />; break;
    case '/registro': page = <Register />; break;
    default: page = <main className="page"><p className="notice">Esta sección aún no está implementada.</p></main>;
  }
  return (
    <>
      {!FULL_SCREEN.includes(route) && <Navbar current={route} />}
      {page}
      <footer className="demo-nav">
        Vistas de demostración: <a href="#/login">Inicio de sesión</a> · <a href="#/registro">Registro</a> · <a href="#/crear-simulacro">Crear simulacro</a> · <a href="#/simulacro">Simulacro activo</a> · <a href="#/brigadista">Brigadista</a>
      </footer>
    </>
  );
}
