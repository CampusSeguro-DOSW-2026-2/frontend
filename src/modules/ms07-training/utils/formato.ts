/** Fecha corta en español de Colombia para los listados (el servidor manda instantes ISO en UTC). */
export function fechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
