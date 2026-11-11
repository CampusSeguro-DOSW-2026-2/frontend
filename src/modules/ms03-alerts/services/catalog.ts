import type { AlertType, Recipient } from './alerts';

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

// Roles oficiales de CampusSeguro que pueden recibir alertas (permiso ms03:alert:receive).
// ADMIN y AUDITOR existen pero no reciben alertas, por eso no se ofrecen como destinatarios.
export const ROLE_ITEMS: CatalogItem[] = [
  { id: 'ESTUDIANTE', label: 'Estudiantes', group: 'Roles' },
  { id: 'PROFESOR', label: 'Profesores', group: 'Roles' },
  { id: 'ADMINISTRATIVO', label: 'Personal administrativo', group: 'Roles' },
  { id: 'BRIGADISTA', label: 'Brigadistas', group: 'Roles' },
  { id: 'COORDINADOR', label: 'Coordinadores', group: 'Roles' },
  { id: 'ORGANIZADOR', label: 'Organizadores', group: 'Roles' },
];
// Etiquetas de los 8 roles oficiales, para mostrar alertas creadas fuera de esta pantalla (p. ej. por MS06).
const ROLE_LABELS: Record<string, string> = {
  ...Object.fromEntries(ROLE_ITEMS.map((r) => [r.id, r.label])),
  ADMIN: 'Administradores',
  AUDITOR: 'Auditores',
};

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
  const l = xs.map((x, i) => (i === 0 ? x : x.charAt(0).toLowerCase() + x.slice(1)));
  return l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l[0] ?? '';
};
/** Destinatarios en texto: los roles por nombre y los usuarios individuales como un conteo. */
export const recipientsText = (recipients: Recipient[]) => {
  const names = recipients.filter((r) => r.type === 'ROLE').map((r) => ROLE_LABELS[r.id] ?? r.id);
  const users = recipients.filter((r) => r.type === 'USER').length;
  if (users) names.push(users === 1 ? '1 usuario' : `${users} usuarios`);
  return listEs(names);
};
/** Texto del alcance; si el catálogo de MS02 aún no llegó, muestra el id para no ocultar información. */
export const scopeText = (s: { type: string; ids?: string[] }, catalog?: ScopeCatalog | null) => {
  if (s.type === 'CAMPUS') return 'Todo el campus';
  const items = catalog ? [...catalog.buildings, ...catalog.zones] : [];
  return scopeIdsOf(s).map((id) => labelOf(items, id)).join(', ');
};
