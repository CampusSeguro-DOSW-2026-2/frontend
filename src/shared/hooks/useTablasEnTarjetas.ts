import { useEffect } from 'react';

/**
 * En celular, toda tabla con encabezado se muestra como tarjetas (una por fila), sin desplazamiento horizontal. Este hook
 * marca cada tabla con la clase `tarjetas` y pone en cada celda `data-label` con el nombre de su columna, que el CSS
 * muestra encima del valor (shared/styles.css). Solo es presentación: no cambia los datos ni el orden.
 *
 * Una tabla que deba conservar sus columnas lleva `data-tabla="fija"`. Las celdas que ocupan varias columnas (por
 * ejemplo, un formulario de edición dentro de la tabla) van sin etiqueta y a lo ancho.
 * App lo monta una sola vez.
 */
export function useTablasEnTarjetas(): void {
  useEffect(() => {
    let pendiente = 0;
    const recorrer = () => {
      pendiente = 0;
      document.querySelectorAll('table').forEach((t) => etiquetar(t));
    };
    recorrer();
    // Solo se observan nodos agregados o quitados: los atributos que pone etiquetar() no vuelven a disparar el observador
    const observador = new MutationObserver(() => {
      if (!pendiente) pendiente = window.requestAnimationFrame(recorrer);
    });
    observador.observe(document.body, { childList: true, subtree: true });
    return () => {
      observador.disconnect();
      if (pendiente) window.cancelAnimationFrame(pendiente);
    };
  }, []);
}

function etiquetar(tabla: HTMLTableElement): void {
  if (tabla.dataset.tabla === 'fija') return;
  const encabezados = Array.from(tabla.tHead?.rows[0]?.cells ?? []);
  if (encabezados.length === 0) return;
  if (!tabla.classList.contains('tarjetas')) tabla.classList.add('tarjetas');
  const nombres = encabezados.flatMap((th) => Array<string>(th.colSpan || 1).fill((th.textContent ?? '').trim()));
  for (const cuerpo of Array.from(tabla.tBodies)) {
    for (const fila of Array.from(cuerpo.rows)) {
      let columna = 0;
      for (const celda of Array.from(fila.cells)) {
        const ancho = celda.colSpan || 1;
        const nombre = ancho > 1 ? '' : (nombres[columna] ?? '');
        if (celda.dataset.label !== nombre) celda.dataset.label = nombre;
        columna += ancho;
      }
    }
  }
}
