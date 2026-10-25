import { useEffect, useState } from 'react';
import { Navbar } from './components/Layout';
import CreateSimulation from './pages/CreateSimulation';
import ActiveSimulation from './pages/ActiveSimulation';
import BrigadistaPanel from './pages/BrigadistaPanel';
import RouteQuery from './pages/campus/RouteQuery';
import './styles.css';

// Router mínimo por hash para no añadir dependencias; sustituible por react-router.
const path = () => window.location.hash.replace(/^#/, '') || '/';

export default function App() {
  const [route, setRoute] = useState(path());
  useEffect(() => { const f = () => setRoute(path()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);

  let page;
  switch (route) {
    case '/': case '/simulacro': page = <ActiveSimulation />; break;
    case '/crear-simulacro': page = <CreateSimulation />; break;
    case '/brigadista': page = <BrigadistaPanel />; break;
    case '/rutas': page = <RouteQuery />; break;
    default: page = <main className="page"><p className="notice">Esta sección aún no está implementada.</p></main>;
  }
  return (
    <>
      <Navbar current={route} />
      {page}
      <footer className="demo-nav">
        Vistas de demostración: <a href="#/crear-simulacro">Crear simulacro</a> · <a href="#/simulacro">Simulacro activo</a> · <a href="#/brigadista">Brigadista</a>
      </footer>
    </>
  );
}
