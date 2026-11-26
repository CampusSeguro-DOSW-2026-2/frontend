import { etiquetaCodigo, etiquetaRol } from '../../../shared/utils/etiquetas';
import { isTechnicalId } from '../../../shared/utils/text';
import type { ScopeCatalog } from '../../ms03-alerts/services/catalog';
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
  ESTADOS_EVENTO.find((e) => e.codigo === codigo)?.texto ?? etiquetaCodigo(codigo);

/** Rol convocado con su nombre legible (los roles son dinámicos: los nuevos se muestran como frase con tildes). */
export const textoRol = (rol: string): string => etiquetaRol(rol);

/** Texto que ve el usuario para cada estado, en el orden en que se muestran (F-01, RN-MS04-03). */
export const ESTADOS: { codigo: EstadoCheckin; texto: string }[] = [
  { codigo: 'SAFE', texto: 'Estoy a salvo' },
  { codigo: 'EVACUATING', texto: 'Estoy evacuando' },
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

/**
 * Edificios o zonas del escenario en texto. MS06 debe enviar los nombres de MS02 (RN-MS04-24), pero los eventos que
 * MS04 ya guardó con los ids de MS02 se traducen con el catálogo de MS02 (también los inactivos). Un texto que no es
 * un id (un nombre) se muestra tal cual. Un id sin nombre (MS02 no lo conoce o no respondió) se omite: nunca se
 * muestra un UUID. Si no queda ningún nombre devuelve '' y la pantalla omite el dato.
 */
export function textoEscenario(valores: string[], catalog: ScopeCatalog | null): string {
  const items = catalog ? [...catalog.buildings, ...catalog.zones] : [];
  return valores
    .map((v) => items.find((i) => i.id === v)?.label ?? catalog?.names?.[v] ?? (isTechnicalId(v) ? '' : v.trim()))
    .filter(Boolean)
    .join(', ');
}
