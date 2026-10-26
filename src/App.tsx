import { useEffect, useState } from 'react';
import { Navbar } from './components/Layout';
import CreateSimulation from './pages/CreateSimulation';
import ActiveSimulation from './pages/ActiveSimulation';
import BrigadistaPanel from './pages/BrigadistaPanel';
import AlertList from './pages/AlertList';
import AlertForm from './pages/AlertForm';
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
    case '/alertas': page = <AlertList />; break;
    case '/alertas/nueva': page = <AlertForm key="new" />; break;
    default: {
      const m = route.match(/^\/alertas\/([^/]+)\/editar$/);
      page = m ? <AlertForm key={m[1]} editId={m[1]} /> : <main className="page"><p className="notice">Esta sección aún no está implementada.</p></main>;
    }
  }
  return (
    <>
      <Navbar current={route} />
      {page}
      {/* Solo en desarrollo: acceso a las pantallas de prueba (la barra del mockup no tiene "Alertas"). */}
      {import.meta.env.DEV && <footer className="demo-nav">
        Vistas de demostración: <a href="#/crear-simulacro">Crear simulacro</a> · <a href="#/simulacro">Simulacro activo</a> · <a href="#/brigadista">Brigadista</a> · <a href="#/alertas">Alertas</a>
      </footer>}
    </>
  );
}
