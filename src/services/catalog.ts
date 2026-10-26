// Catálogo local (ids y nombres del catálogo de prueba de MS03). MS03 no expone un endpoint de catálogo;
// cuando MS02/MS01 lo ofrezcan, sustituir este archivo por una llamada HTTP.
export interface CatalogItem { id: string; label: string; group: string }
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
