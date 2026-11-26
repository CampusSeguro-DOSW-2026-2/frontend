import type { GuiaEvacuacion as Guia } from '../types';

// Una escalera recomendada por tramo (en orden) y las alternas entre paréntesis. Sin `tramo` (respuestas
// antiguas) se listan todas como opciones.
export function textoEscaleras(escaleras: Guia['escaleras']): string {
  if (escaleras.every((e) => e.tramo === undefined)) return escaleras.map((e) => e.nombre).join(' o ');
  const tramos = new Map<number, Guia['escaleras']>();
  escaleras.forEach((e) => tramos.set(e.tramo ?? 1, [...(tramos.get(e.tramo ?? 1) ?? []), e]));
  return [...tramos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, lista]) => {
      const [principal, ...alternas] = lista;
      return alternas.length > 0
        ? `${principal.nombre} (alterna: ${alternas.map((a) => a.nombre).join(', ')})`
        : principal.nombre;
    })
    .join(' → ');
}
