import type { ReactNode } from 'react';
import BrigadistaPanel from './pages/BrigadistaPanel';

/** Rutas de MS05. Devuelve undefined si la ruta no es de este módulo. */
export function brigadesRoutes(route: string): ReactNode | undefined {
  return route === '/brigadista' ? <BrigadistaPanel /> : undefined;
}
