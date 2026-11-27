/**
 * Ayudas comunes para los mapas Leaflet (MS02 rutas y coordenadas, MS05 auto asignación).
 *
 * Leaflet pinta los marcadores en SVG y necesita los colores como texto: se leen de los tokens de styles.css (:root)
 * con getComputedStyle, así ningún módulo escribe colores a mano y un cambio de paleta llega también al mapa.
 */
export function colorToken(nombre: `--${string}`): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

/** Pantalla táctil sin puntero fino (celular o tableta). */
export const esTactil = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/**
 * Opciones de MapContainer. En celular el mapa no captura el desplazamiento con un dedo: sin `dragging`, un dedo
 * desplaza la página y dos dedos mueven y acercan el mapa (touchZoom sigue el centro del gesto). Con mouse se arrastra
 * normal. La rueda del mouse nunca acerca el mapa, para no atrapar el scroll de la página.
 */
export function opcionesMapa() {
  return { dragging: !esTactil(), touchZoom: true, scrollWheelZoom: false } as const;
}

/** Radio del área táctil de un marcador: 22 px, es decir, 44 × 44 px (docs/PATRONES-UI.md). */
export const RADIO_TACTIL = 22;
