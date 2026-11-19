import type { ReactNode } from 'react';
import { LifeBuoy, MapLine } from '../../../shared/components/Icons';
import { PERMISSION } from '../../../shared/permissions';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import '../styles/checkin.css';

/** Acceso a otra sección durante el evento; solo se muestra con el permiso que exige esa sección. */
interface Accion {
  titulo: string; texto: string; href: string; boton: string; permiso: string; icono: ReactNode; destacada?: boolean;
}

const ACCIONES: Accion[] = [
  {
    titulo: 'Rutas', texto: 'Consulte las rutas de evacuación y las salidas indicadas para su zona.',
    href: '#/rutas', boton: 'Consultar rutas', permiso: PERMISSION.MS02_ROUTE_READ, icono: <MapLine />,
  },
  {
    titulo: 'Reportar un incidente', texto: 'Informe una situación y su prioridad para que la brigada la atienda.',
    href: '#/ayuda', boton: 'Reportar incidente', permiso: PERMISSION.MS05_INCIDENT_REPORT, icono: <LifeBuoy />,
    destacada: true,
  },
];

/**
 * Accesos rápidos «¿Qué necesita hacer?»: las rutas (MS02) y el reporte de incidentes (MS05) son accesos a sus propias
 * pantallas, visibles solo con su permiso. Sin ningún permiso no se muestra nada.
 */
export function AccionesEvento({ session }: { session: Session }) {
  const acciones = ACCIONES.filter((a) => hasPermission(session, a.permiso));
  if (acciones.length === 0) return null;
  return (
    <section className="chk-bloque" aria-labelledby="chk-acciones-titulo">
      <div>
        <h2 id="chk-acciones-titulo" className="title">¿Qué necesita hacer?</h2>
        <p className="chk-sub">Siga las indicaciones de la brigada y elija la acción que necesita.</p>
      </div>
      <ul className="chk-acciones" aria-label="Acciones durante el evento">
        {acciones.map((a) => (
          <li key={a.href} className={`chk-accion${a.destacada ? ' destacada' : ''}`}>
            <span className="chk-accion-ico" aria-hidden="true">{a.icono}</span>
            <h3>{a.titulo}</h3>
            <p>{a.texto}</p>
            <a className={`btn ${a.destacada ? 'red' : 'white'}`} href={a.href}>{a.boton} →</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
