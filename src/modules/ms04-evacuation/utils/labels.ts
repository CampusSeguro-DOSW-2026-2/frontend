import type { EstadoCheckin } from '../types';

/** Texto que ve el usuario para cada estado, en el orden en que se muestran (F-01, RN-MS04-03). */
export const ESTADOS: { codigo: EstadoCheckin; texto: string }[] = [
  { codigo: 'SAFE', texto: 'Estoy a salvo' },
  { codigo: 'EVACUATING', texto: 'Me estoy evacuando' },
  { codigo: 'NEEDS_ASSISTANCE', texto: 'Requiero asistencia' },
  { codigo: 'OFF_CAMPUS', texto: 'No estoy en el campus' },
];

export const textoEstado = (codigo: EstadoCheckin): string =>
  ESTADOS.find((e) => e.codigo === codigo)?.texto ?? codigo;

/** Simulacro o emergencia real, como lo marca MS06 en el evento. */
export const tipoEvento = (simulacro: boolean): string => (simulacro ? 'Simulacro' : 'Emergencia');

const FECHA_HORA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/** Fecha y hora local legible a partir de un ISO 8601; vacío si no hay fecha o no es válida. */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '' : FECHA_HORA.format(fecha);
}
