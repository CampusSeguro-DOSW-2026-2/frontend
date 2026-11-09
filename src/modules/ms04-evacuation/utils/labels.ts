/** Simulacro o emergencia real, como lo marca MS06 en el evento. */
export const tipoEvento = (simulacro: boolean): string => (simulacro ? 'Simulacro' : 'Emergencia');

const FECHA_HORA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/** Fecha y hora local legible a partir de un ISO 8601; vacío si no hay fecha o no es válida. */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '' : FECHA_HORA.format(fecha);
}
