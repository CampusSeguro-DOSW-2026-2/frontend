import { request } from '../../../shared/services/http';
import { getSession } from '../../../shared/services/session';
import { read, write } from '../../../shared/services/localStore';

/**
 * Participantes en vivo (MS01): los roles que pueden recibir las alertas de un evento, incluidos los que crea o
 * edita el administrador. Se reutiliza `GET /api/v1/roles/alert-recipients`, el mismo endpoint que ya usa el selector
 * de destinatarios de MS03: devuelve solo nombre y descripción de los roles con `ms03:alert:receive`, que son los que
 * MS06 puede convocar. Lo autorizan `ms03:alert:manage` o `ms03:alert:manage_drill`, que ya tienen los roles que
 * crean eventos (ORGANIZADOR y COORDINADOR en la matriz de MS01).
 *
 * La última lista que entregó MS01 se guarda en el navegador y se reemplaza en cada consulta exitosa. Si MS01 no
 * responde, el formulario usa esa copia para seguir listando participantes; nunca inventa roles que MS01 no haya
 * entregado alguna vez.
 */
export interface ParticipantItem {
  id: string;
  label: string;
  group: string;
}

interface ParticipantRoleResponse {
  rol: string;
  descripcion: string;
}

interface CachedRoles {
  roles: string[];
  savedAt: string;
}

const CACHE_KEY = 'cs.ms06.participantRoles';
// Mismo formato que acepta MS06 para un rol (Estándares: mayúsculas, dígitos y guion bajo).
const ROLE_FORMAT = /^[A-Z][A-Z0-9_]{1,29}$/;
const MAX_ROLES = 50;

const isRole = (value: unknown): value is string => typeof value === 'string' && ROLE_FORMAT.test(value);

/** Opción del selector: el nombre del rol tal como lo guarda MS01. */
export const participantItem = (rol: string): ParticipantItem => ({ id: rol, label: rol, group: 'Roles' });

function saveRoles(roles: string[]) {
  try {
    write(CACHE_KEY, { roles, savedAt: new Date().toISOString() });
  } catch {
    // Sin almacenamiento (navegación privada, cuota): la consulta en vivo sigue funcionando igual.
  }
}

function readCachedRoles(): string[] | null {
  const cached = read<CachedRoles | null>(CACHE_KEY, null);
  if (!cached || !Array.isArray(cached.roles)) {
    return null;
  }
  return [...new Set(cached.roles.filter(isRole))].slice(0, MAX_ROLES);
}

/** Copia guardada de la última lista que entregó MS01, o null si este navegador nunca la recibió. */
export function cachedParticipantRoles(): ParticipantItem[] | null {
  const roles = readCachedRoles();
  return roles?.map((role) => participantItem(role)) ?? null;
}

export async function loadParticipantRoles(): Promise<ParticipantItem[]> {
  const data = await request('/api/v1/roles/alert-recipients', { session: getSession() ?? undefined });
  const roles = [...new Set(((data ?? []) as ParticipantRoleResponse[]).map((role) => role?.rol).filter(isRole))];
  saveRoles(roles);
  return roles.map((role) => participantItem(role));
}
