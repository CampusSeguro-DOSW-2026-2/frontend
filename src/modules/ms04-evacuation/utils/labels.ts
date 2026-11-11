import type { EstadoCheckin, EstadoEvento } from '../types';

/** Estados del evento en el orden del filtro (F-07); '' es Todos. */
export const ESTADOS_EVENTO: { codigo: EstadoEvento | ''; texto: string }[] = [
  { codigo: '', texto: 'Todos' },
  { codigo: 'BORRADOR', texto: 'Borrador' },
  { codigo: 'PROGRAMADO', texto: 'Programado' },
  { codigo: 'EN_EJECUCION', texto: 'En ejecución' },
  { codigo: 'FINALIZADO', texto: 'Finalizado' },
];

export const textoEstadoEvento = (codigo: EstadoEvento): string =>
  ESTADOS_EVENTO.find((e) => e.codigo === codigo)?.texto ?? codigo;

const ROLES: Record<string, string> = {
  ESTUDIANTE: 'Estudiantes', PROFESOR: 'Profesores', ADMINISTRATIVO: 'Personal administrativo',
  BRIGADISTA: 'Brigadistas', COORDINADOR: 'Coordinadores', ORGANIZADOR: 'Organizadores',
};

/** Rol convocado en plural, como se lista en el evento. */
export const textoRol = (rol: string): string => ROLES[rol] ?? rol;

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
