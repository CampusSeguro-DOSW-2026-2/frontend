import type { AlertType, Recipient, Scope } from './alerts';

export interface CatalogItem { id: string; label: string; group: string }

/** Catálogo de alcance cargado de MS02: los ids que MS03 acepta en `scope.ids`. */
export interface ScopeCatalog {
  buildings: CatalogItem[];
  zones: CatalogItem[];
}

/** Único alcance que no depende del catálogo remoto. */
export const CAMPUS_ITEM: CatalogItem = { id: 'CAMPUS', label: 'Todo el campus', group: 'Campus' };

// LEGADO: ids de demostración del catálogo de prueba. MS03 ya no los usa (su picker sale de MS02,
// ver `services/scope.ts`); se conservan porque MS06 los reutiliza para el alcance de sus eventos.
export const SCOPE_ITEMS: CatalogItem[] = [
  { id: 'CAMPUS', label: 'Todo el campus', group: 'Campus' },
  { id: 'BLD-001', label: 'Edificio A', group: 'Edificios' },
  { id: 'BLD-002', label: 'Edificio B', group: 'Edificios' },
  { id: 'BLD-003', label: 'Edificio C', group: 'Edificios' },
  { id: 'BLD-004', label: 'Edificio D', group: 'Edificios' },
  { id: 'BLD-005', label: 'Edificio E', group: 'Edificios' },
  { id: 'BLD-006', label: 'Edificio F', group: 'Edificios' },
  { id: 'BLD-007', label: 'Edificio G', group: 'Edificios' },
  { id: 'BLD-008', label: 'Edificio H', group: 'Edificios' },
  { id: 'BLD-009', label: 'Edificio I', group: 'Edificios' },
  { id: 'BLD-010', label: 'Biblioteca Jorge Álvarez Lleras', group: 'Edificios' },
  { id: 'BLD-011', label: 'Coliseo El Otoño', group: 'Edificios' },
  { id: 'ZON-001', label: 'Plazoleta frente al Edificio F', group: 'Zonas' },
];

// Opción de destinatario para un rol de MS01: se muestra con su nombre original, el mismo que guarda MS01. La lista de
// roles que reciben alertas no se declara aquí: sale de MS01 (`services/recipients.ts`), que incluye los roles que cree
// o edite el administrador.
export const roleItem = (rol: string): CatalogItem => ({ id: rol, label: rol, group: 'Roles' });

// Tipos de alerta. OPERATIVA (logística o administrativa) es exclusiva: no se combina con los de emergencia.
export const TYPE_ITEMS: CatalogItem[] = [
  { id: 'EARTHQUAKE', label: 'Sismo', group: 'Emergencia' },
  { id: 'FIRE', label: 'Incendio', group: 'Emergencia' },
  { id: 'OTHER', label: 'Otra emergencia', group: 'Emergencia' },
  { id: 'OPERATIVA', label: 'Operativa (logística o administrativa)', group: 'Operativa' },
];
export const DEFAULT_TYPES: AlertType[] = ['OTHER'];
/** Aplica la regla de MS03: OPERATIVA va sola; los tipos de emergencia se pueden combinar. */
export const toggleType = (current: AlertType[], id: AlertType): AlertType[] => {
  if (current.includes(id)) return current.filter((t) => t !== id);
  if (id === 'OPERATIVA') return ['OPERATIVA'];
  return [...current.filter((t) => t !== 'OPERATIVA'), id];
};

export const labelOf = (items: CatalogItem[], id: string) => items.find((i) => i.id === id)?.label ?? id;
export const scopeIdsOf = (s: { type: string; ids?: string[] }) => (s.type === 'CAMPUS' ? ['CAMPUS'] : s.ids ?? []);
export const listEs = (xs: string[]) => {
  // Los nombres en mayúsculas (los roles de MS01) se muestran tal cual
  const l = xs.map((x, i) => (i === 0 || x === x.toUpperCase() ? x : x.charAt(0).toLowerCase() + x.slice(1)));
  return l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l[0] ?? '';
};
/** Destinatarios en texto: los roles por nombre y los usuarios individuales como un conteo. */
export const recipientsText = (recipients: Recipient[]) => {
  const names = recipients.filter((r) => r.type === 'ROLE').map((r) => r.id);
  const users = recipients.filter((r) => r.type === 'USER').length;
  if (users) names.push(users === 1 ? '1 usuario' : `${users} usuarios`);
  return listEs(names);
};
/**
 * Texto del alcance. MS03 manda `scope` en null cuando la alerta cubre más de un tipo de alcance, así que
 * se prefiere la lista `scopes`. Si el catálogo de MS02 aún no llegó, muestra el id para no ocultar información.
 */
export const scopeText = (scope: Scope | null | undefined, catalog?: ScopeCatalog | null, scopes?: Scope[] | null) => {
  const list = scopes?.length ? scopes : scope ? [scope] : [];
  if (!list.length) return 'Sin alcance';
  const items = catalog ? [...catalog.buildings, ...catalog.zones] : [];
  return list
    .map((s) => (s.type === 'CAMPUS' ? 'Todo el campus' : scopeIdsOf(s).map((id) => labelOf(items, id)).join(', ')))
    .filter((text) => text !== '')
    .join(' · ');
};
