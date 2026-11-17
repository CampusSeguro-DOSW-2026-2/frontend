/**
 * Permisos de MS01 que decide la interfaz (Matriz Rol‐Permiso, x-permiso del contrato). Las pantallas se muestran
 * según estos permisos del token y nunca según el nombre del rol: el administrador puede crear roles y cambiar sus
 * permisos (RF-MS01-10). El back vuelve a verificar cada permiso.
 */
export const PERMISSION = {
  USER_READ: 'ms01:user:read',
  USER_STATUS: 'ms01:user:status',
  USER_ROLES: 'ms01:user:roles',
  ROLE_READ_ALL: 'ms01:role:read_all',
  ROLE_MANAGE: 'ms01:role:manage',
} as const;

/** Permisos que todo rol conserva siempre (RN-MS01-41): el sistema los agrega al crear un rol. */
export const MANDATORY_PERMISSIONS = ['ms01:profile:read', 'ms01:session:logout'];

/** Roles que además deben conservar ms01:profile:write (RN-MS01-41). */
export const PROFILE_WRITE_ROLES = ['ESTUDIANTE', 'ADMIN'];

const PROFILE_WRITE = 'ms01:profile:write';
const ADMIN_ROLE = 'ADMIN';

/**
 * Permisos que un rol debe conservar (locked) y los que no puede tener (forbidden), RN-MS01-30 y RN-MS01-41: todo rol
 * conserva ms01:profile:read y ms01:session:logout, ESTUDIANTE y ADMIN además ms01:profile:write, y ms01:role:manage es
 * solo de ADMIN, que siempre lo conserva. Un rol nuevo se trata como cualquier rol que no es ADMIN.
 */
export function permissionRulesFor(role: string): { locked: string[]; forbidden: string[] } {
  const locked = [...MANDATORY_PERMISSIONS];
  if (PROFILE_WRITE_ROLES.includes(role)) locked.push(PROFILE_WRITE);
  if (role === ADMIN_ROLE) locked.push(PERMISSION.ROLE_MANAGE);
  return { locked, forbidden: role === ADMIN_ROLE ? [] : [PERMISSION.ROLE_MANAGE] };
}
