// Catálogo local (ids y nombres del catálogo de prueba de MS03). MS03 no expone un endpoint de catálogo;
// cuando MS02/MS01 lo ofrezcan, sustituir este archivo por una llamada HTTP.
export interface CatalogItem { id: string; label: string; group: string }
export const SCOPE_ITEMS: CatalogItem[] = [
  { id: 'CAMPUS', label: 'Todo el campus', group: 'Campus' },
  { id: 'BLD-001', label: 'Edificio Central', group: 'Edificios' },
  { id: 'BLD-002', label: 'Biblioteca', group: 'Edificios' },
  { id: 'BLD-003', label: 'Laboratorios', group: 'Edificios' },
  { id: 'BLD-004', label: 'Bienestar Universitario', group: 'Edificios' },
  { id: 'BLD-005', label: 'Cafetería', group: 'Edificios' },
  { id: 'ZON-001', label: 'Parqueadero Norte', group: 'Zonas' },
  { id: 'ZON-002', label: 'Plazoleta Principal', group: 'Zonas' },
  { id: 'ZON-003', label: 'Zona Deportiva', group: 'Zonas' },
  { id: 'ZON-004', label: 'Punto de Encuentro 1', group: 'Zonas' },
];
export const ROLE_ITEMS: CatalogItem[] = [
  { id: 'STUDENT', label: 'Estudiantes', group: 'Roles' },
  { id: 'TEACHER', label: 'Profesores', group: 'Roles' },
  { id: 'STAFF', label: 'Personal administrativo', group: 'Roles' },
  { id: 'SECURITY', label: 'Seguridad', group: 'Roles' },
];
export const labelOf = (items: CatalogItem[], id: string) => items.find((i) => i.id === id)?.label ?? id;
export const scopeIdsOf = (s: { type: string; ids?: string[] }) => (s.type === 'CAMPUS' ? ['CAMPUS'] : s.ids ?? []);
export const listEs = (xs: string[]) => {
  const l = xs.map((x, i) => (i === 0 ? x : x.charAt(0).toLowerCase() + x.slice(1)));
  return l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l[0] ?? '';
};
