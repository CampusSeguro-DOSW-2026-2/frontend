import type { ReactNode } from 'react';
import CreateSimulation from './pages/CreateSimulation';

/** Rutas de MS06. Devuelve undefined si la ruta no es de este módulo. */
export function drillsRoutes(route: string): ReactNode | undefined {
  return route === '/crear-simulacro' ? <CreateSimulation /> : undefined;
}
