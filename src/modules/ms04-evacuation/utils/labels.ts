import type { EstadoCheckin, EstadoEnvio, TipoUbicacion } from '../types';

/** Mensajes de éxito de F-01 con Requiero asistencia, según cómo quedó la solicitud en MS05 (RF-MS04-04). */
export const MENSAJE_SOLICITUD: Record<EstadoEnvio, string> = {
  ENVIADA: 'Su estado quedó registrado y su solicitud de asistencia fue enviada.',
  PENDIENTE_ENVIO: 'Su estado quedó registrado. La solicitud de asistencia se enviará en cuanto el servicio esté disponible.',
  RECHAZADA: 'Su estado quedó registrado, pero la solicitud de asistencia no pudo crearse. Un coordinador la revisará.',
};

/** Estado de la solicitud de asistencia, tal como se muestra junto al estado vigente. */
export const TEXTO_ENVIO: Record<EstadoEnvio, string> = {
  ENVIADA: 'Enviada',
  PENDIENTE_ENVIO: 'Pendiente de envío',
  RECHAZADA: 'No pudo crearse; un coordinador la revisará',
};

/** Texto que ve el usuario para cada estado, en el orden en que se muestran (F-01, RN-MS04-03). */
export const ESTADOS: { codigo: EstadoCheckin; texto: string }[] = [
  { codigo: 'SAFE', texto: 'Estoy a salvo' },
  { codigo: 'EVACUATING', texto: 'Me estoy evacuando' },
  { codigo: 'NEEDS_ASSISTANCE', texto: 'Requiero asistencia' },
  { codigo: 'OFF_CAMPUS', texto: 'No estoy en el campus' },
];

export const textoEstado = (codigo: EstadoCheckin): string =>
  ESTADOS.find((e) => e.codigo === codigo)?.texto ?? codigo;

/** Tipos de lugar de MS02 donde se puede pedir asistencia (RN-MS04-09), en el orden en que se muestran. */
export const TIPOS_UBICACION: { codigo: TipoUbicacion; texto: string; ayuda: string }[] = [
  { codigo: 'EDIFICIO', texto: 'Un edificio', ayuda: 'Estoy dentro o junto a un edificio' },
  { codigo: 'ESPACIO', texto: 'Un espacio', ayuda: 'Salón, laboratorio u otro espacio de un edificio' },
  { codigo: 'PUNTO_ENCUENTRO', texto: 'Un punto de encuentro', ayuda: 'Estoy en un punto de encuentro' },
];

/** Simulacro o emergencia real, como lo marca MS06 en el evento. */
export const tipoEvento = (simulacro: boolean): string => (simulacro ? 'Simulacro' : 'Emergencia');

const FECHA_HORA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/** Fecha y hora local legible a partir de un ISO 8601; vacío si no hay fecha o no es válida. */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? '' : FECHA_HORA.format(fecha);
}
