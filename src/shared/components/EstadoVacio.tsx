import type { ReactNode } from 'react';
import { Inbox } from './Icons';

interface Props {
  /** Qué falta, en una frase corta: «No hay alertas activas». */
  titulo: string;
  /** Qué puede hacer la persona ahora (una línea). */
  children?: ReactNode;
  /** Acción opcional: un botón o enlace .btn. */
  accion?: ReactNode;
  /** Icono propio; por defecto, una bandeja vacía. */
  icono?: ReactNode;
}

/**
 * Estado vacío único: icono, título, una línea con el siguiente paso y una acción opcional. Mide lo que su contenido,
 * sin ocupar la pantalla entera. Reemplaza a ev-empty, chk-vacio, rs-empty, ap-vacio, cs-vacio y alist.empty.
 */
export function EstadoVacio({ titulo, children, accion, icono }: Props) {
  return (
    <div className="vacio">
      <span className="vacio-icono" aria-hidden="true">{icono ?? <Inbox />}</span>
      <h2>{titulo}</h2>
      {children && <p>{children}</p>}
      {accion && <div className="vacio-accion">{accion}</div>}
    </div>
  );
}
