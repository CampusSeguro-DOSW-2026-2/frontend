import type { ReactNode } from 'react';
import { CircleMarker } from 'react-leaflet';
import { RADIO_TACTIL, colorToken } from '../utils/mapa';

interface Props {
  centro: [number, number];
  /** Token de color del relleno (p. ej. '--red'). */
  relleno: `--${string}`;
  /** Token del borde; por defecto la superficie, para que el punto se lea sobre cualquier mapa. */
  borde?: `--${string}`;
  /** Radio visible en px. El área que responde al toque siempre mide 44 px. */
  radio?: number;
  atenuado?: boolean;
  onClick?: () => void;
  /** Popup o Tooltip de react-leaflet. */
  children?: ReactNode;
}

/**
 * Marcador de mapa con colores de los tokens y un área táctil de 44 px: un círculo visible y, encima, uno transparente
 * de 22 px de radio que recibe el toque y lleva el Popup o el Tooltip. Sin onClick ni hijos solo pinta el punto.
 */
export function MarcadorMapa({ centro, relleno, borde = '--surface', radio = 11, atenuado = false, onClick, children }: Props) {
  const visible = (
    <CircleMarker center={centro} radius={radio} interactive={false}
      pathOptions={{ color: colorToken(borde), weight: 3, fillColor: colorToken(relleno), fillOpacity: atenuado ? 0.5 : 1 }} />
  );
  // Sin nada que tocar (p. ej. el punto elegido en el selector de coordenadas) no tapa los clics sobre el mapa
  if (!onClick && !children) return visible;
  return (
    <>
      {visible}
      <CircleMarker center={centro} radius={Math.max(RADIO_TACTIL, radio)} bubblingMouseEvents={false}
        pathOptions={{ stroke: false, fill: true, fillOpacity: 0 }}
        eventHandlers={onClick ? { click: onClick } : undefined}>
        {children}
      </CircleMarker>
    </>
  );
}
