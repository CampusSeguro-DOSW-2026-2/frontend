import { request } from '../../../shared/services/http';
import { getSession } from '../../../shared/services/session';
import { read, write } from '../../../shared/services/localStore';
import { roleItem, type CatalogItem } from './catalog';

/**
 * Destinatarios en vivo (MS01, RF-MS01-10): los roles que tienen `ms03:alert:receive`, incluidos los que crea o
 * edita el administrador. `GET /roles/alert-recipients` se autoriza con `ms03:alert:manage` o
 * `ms03:alert:manage_drill`, los mismos permisos que abren este formulario, y solo devuelve nombre y descripción.
 *
 * La última lista que entregó MS01 se guarda en el navegador y se reemplaza en cada consulta exitosa. Si MS01 no
 * responde, el formulario usa esa copia para seguir listando destinatarios; nunca inventa roles que MS01 no haya
 * entregado alguna vez.
 */
interface AlertRecipientRole { rol: string; descripcion: string }

interface CachedRoles { roles: string[]; savedAt: string }

const CACHE_KEY = 'cs.ms03.recipientRoles';
// Mismo formato que acepta MS03 para un rol (Estándares: mayúsculas, dígitos y guion bajo).
const ROLE_FORMAT = /^[A-Z][A-Z0-9_]{1,29}$/;
const MAX_ROLES = 50;

const isRole = (value: unknown): value is string => typeof value === 'string' && ROLE_FORMAT.test(value);

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
export function cachedRecipientRoles(): CatalogItem[] | null {
  const roles = readCachedRoles();
  return roles?.map((role) => roleItem(role)) ?? null;
}

export async function loadRecipientRoles(): Promise<CatalogItem[]> {
  const data = await request('/api/v1/roles/alert-recipients', { session: getSession() ?? undefined });
  const roles = [...new Set(((data ?? []) as AlertRecipientRole[]).map((role) => role?.rol).filter(isRole))];
  saveRoles(roles);
  return roles.map((role) => roleItem(role));
}
