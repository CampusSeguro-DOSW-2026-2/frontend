import type { AlertType, Recipient, Scope } from './alerts';
import { isTechnicalId } from '../../../shared/utils/text';
import { etiquetaRol } from '../../../shared/utils/etiquetas';

export interface CatalogItem { id: string; label: string; group: string }

/** Catálogo de alcance cargado de MS02: los ids que MS03 acepta en `scope.ids`. */
export interface ScopeCatalog {
  buildings: CatalogItem[];
  zones: CatalogItem[];
  /** Nombre de cada edificio y zona, también los inactivos (solo para mostrar). */
  names?: Record<string, string>;
}

/** Texto para un lugar cuyo nombre no se pudo obtener de MS02: nunca se muestra su id. */
export const UNKNOWN_PLACE = 'Lugar sin nombre disponible';

/** Único alcance que no depende del catálogo remoto. */
export const CAMPUS_ITEM: CatalogItem = { id: 'CAMPUS', label: 'Todo el campus', group: 'Campus' };

// Opción de destinatario para un rol de MS01: se muestra con su nombre original, el mismo que guarda MS01. La lista de
// roles que reciben alertas no se declara aquí: sale de MS01 (`services/recipients.ts`), que incluye los roles que cree
// o edite el administrador.
// El id es el código del rol (lo que se envía a MS03); la etiqueta, su nombre legible («Brigadista», no «BRIGADISTA»).
export const roleItem = (rol: string): CatalogItem => ({ id: rol, label: etiquetaRol(rol), group: 'Roles' });

// OPERATIVA (logística o administrativa) es el único tipo local de MS03: el resto sale del catálogo de MS06.
// Es exclusiva: no se combina con los de emergencia.
export const OPERATIONAL_TYPE = 'OPERATIVA';

/**
 * Tipo por defecto del formulario, deducido del catálogo de MS03: prefiere `OTRO`; si no está, el primer tipo
 * distinto de OPERATIVA; si el catálogo solo trae OPERATIVA (o está vacío), el primero o cadena vacía.
 */
export const defaultAlertType = (items: CatalogItem[]): string => {
  if (items.some((item) => item.id === 'OTRO')) return 'OTRO';
  const emergency = items.find((item) => item.id !== OPERATIONAL_TYPE);
  return emergency?.id ?? items[0]?.id ?? '';
};

/** Aplica la regla de MS03: OPERATIVA va sola; los tipos de emergencia se pueden combinar. */
export const toggleType = (current: AlertType[], id: AlertType): AlertType[] => {
  if (current.includes(id)) return current.filter((t) => t !== id);
  if (id === OPERATIONAL_TYPE) return [OPERATIONAL_TYPE];
  return [...current.filter((t) => t !== OPERATIONAL_TYPE), id];
};

/** Etiqueta de una opción del catálogo; si no está y el valor es un id técnico, un texto genérico (nunca el UUID). */
export const labelOf = (items: CatalogItem[], id: string) =>
  items.find((i) => i.id === id)?.label ?? (isTechnicalId(id) ? 'No disponible' : id);
export const scopeIdsOf = (s: { type: string; ids?: string[] }) => (s.type === 'CAMPUS' ? ['CAMPUS'] : s.ids ?? []);
export const listEs = (xs: string[]) => {
  // Los nombres en mayúsculas (siglas) se muestran tal cual
  const l = xs.map((x, i) => (i === 0 || x === x.toUpperCase() ? x : x.charAt(0).toLowerCase() + x.slice(1)));
  return l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l[0] ?? '';
};
/** Destinatarios en texto: los roles por nombre y los usuarios individuales como un conteo. */
export const recipientsText = (recipients: Recipient[]) => {
  const names = recipients.filter((r) => r.type === 'ROLE').map((r) => etiquetaRol(r.id));
  const users = recipients.filter((r) => r.type === 'USER').length;
  if (users) names.push(users === 1 ? '1 usuario' : `${users} usuarios`);
  return listEs(names);
};
/**
 * Texto del alcance. MS03 manda `scope` en null cuando la alerta cubre más de un tipo de alcance, así que
 * se prefiere la lista `scopes`. Si MS02 no tiene el nombre de un lugar, muestra un texto genérico (nunca el id).
 */
export const scopeText = (scope: Scope | null | undefined, catalog?: ScopeCatalog | null, scopes?: Scope[] | null) => {
  const list = scopes?.length ? scopes : scope ? [scope] : [];
  if (!list.length) return 'Sin alcance';
  const items = catalog ? [...catalog.buildings, ...catalog.zones] : [];
  return list
    .map((s) => (s.type === 'CAMPUS' ? 'Todo el campus' : scopeIdsOf(s)
      .map((id) => items.find((i) => i.id === id)?.label ?? catalog?.names?.[id] ?? UNKNOWN_PLACE).join(', ')))
    .filter((text) => text !== '')
    .join(' · ');
};
