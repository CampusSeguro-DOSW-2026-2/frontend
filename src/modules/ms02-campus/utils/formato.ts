/** Distancia en metros redondeada, con kilómetros desde 1000 m. */
export function distancia(metros: number): string {
  if (metros >= 1000) return `${(metros / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`;
  return `${Math.round(metros)} m`;
}

/** Duración en minutos enteros (mínimo 1), como la indicación de la guía del backend. */
export function duracion(segundos: number): string {
  return `${Math.max(1, Math.round(segundos / 60))} min`;
}
