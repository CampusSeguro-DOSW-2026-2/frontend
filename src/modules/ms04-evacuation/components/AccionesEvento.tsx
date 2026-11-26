import type { ReactNode } from 'react';
import { MapLine } from '../../../shared/components/Icons';
import { PERMISSION } from '../../../shared/permissions';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import '../styles/checkin.css';

/** Acceso a otra sección durante el evento; solo se muestra con el permiso que exige esa sección. */
interface Accion {
  titulo: string; texto: string; href: string; boton: string; permiso: string; icono: ReactNode;
}

const ACCIONES: Accion[] = [
  {
    titulo: 'Rutas', texto: 'Consulte las rutas de evacuación y las salidas indicadas para su zona.',
    href: '#/rutas', boton: 'Consultar rutas', permiso: PERMISSION.MS02_ROUTE_READ, icono: <MapLine />,
  },
];

/**
 * Accesos rápidos «¿Qué necesita hacer?»: cada uno lleva a la pantalla de su microservicio y solo se muestra con su
 * permiso. Hoy es solo Rutas (MS02); cada acceso ocupa una fila a lo ancho. Sin ningún permiso no se muestra nada.
 */
export function AccionesEvento({ session }: { session: Session }) {
  const acciones = ACCIONES.filter((a) => hasPermission(session, a.permiso));
  if (acciones.length === 0) return null;
  return (
    <section className="chk-bloque" aria-labelledby="chk-acciones-titulo">
      <h2 id="chk-acciones-titulo" className="chk-bloque-titulo">Accesos rápidos</h2>
      {/* Cada acceso es una fila compacta y toda la fila es el enlace (área táctil completa) */}
      <ul className="chk-accesos" aria-label="Accesos rápidos">
        {acciones.map((a) => (
          <li key={a.href}>
            <a className="chk-acceso" href={a.href}>
              <span className="chk-accion-ico" aria-hidden="true">{a.icono}</span>
              <span className="chk-accion-txt">
                <b>{a.boton}</b>
                <small>{a.texto}</small>
              </span>
              <span className="chk-acceso-ir" aria-hidden="true">→</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
