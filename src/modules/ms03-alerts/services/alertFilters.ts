import { request } from '../../../shared/services/http';
import { getSession } from '../../../shared/services/session';

/**
 * Filtros del listado de alertas en vivo (MS03): `GET /api/v1/alertas/filtros` devuelve los grupos y sus opciones,
 * así que agregar un estado o un tipo en el catálogo no exige cambiar el frontend. Los grupos llegan como `status`
 * (selección única) y `type` (múltiple), pero aquí se tratan de forma genérica.
 *
 * No se guarda copia en el navegador: se consulta cada vez que se abre el listado y cada respuesta reemplaza lo
 * anterior. Si MS03 no responde, el listado sigue funcionando con el error que reporta el hook.
 */
export interface AlertFilterOption { value: string; label: string; finalState?: boolean }
export interface AlertFilterGroup { key: string; label: string; multiple: boolean; options: AlertFilterOption[] }

const INVALID = 'No se pudieron leer los filtros de alertas. Intente de nuevo más tarde.';
const EMPTY = 'Todavía no hay filtros disponibles para las alertas.';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const textOf = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** `finalState` solo viene en los estados; puede faltar o llegar en null y entonces se omite. */
function parseOption(value: unknown): AlertFilterOption {
  if (!isObject(value)) {
    throw new Error(INVALID);
  }
  const code = textOf(value.value);
  const label = textOf(value.label);
  if (!code || !label) {
    throw new Error(INVALID);
  }
  return {
    value: code,
    label,
    ...(typeof value.finalState === 'boolean' ? { finalState: value.finalState } : {}),
  };
}

function parseGroup(value: unknown): AlertFilterGroup {
  if (!isObject(value)) {
    throw new Error(INVALID);
  }
  const key = textOf(value.key);
  const label = textOf(value.label);
  if (!key || !label || !Array.isArray(value.options)) {
    throw new Error(INVALID);
  }
  return {
    key,
    label,
    multiple: value.multiple === true,
    options: value.options.map(parseOption),
  };
}

export async function loadAlertFilters(): Promise<AlertFilterGroup[]> {
  const data = await request('/api/v1/alertas/filtros', { session: getSession() ?? undefined });
  if (!isObject(data) || !Array.isArray(data.groups)) {
    throw new Error(INVALID);
  }
  // Un grupo sin opciones no aporta nada al listado; se descarta y, si no queda ninguno, se reporta vacío.
  const groups = data.groups.map(parseGroup).filter((group) => group.options.length > 0);
  if (!groups.length) {
    throw new Error(EMPTY);
  }
  return groups;
}
