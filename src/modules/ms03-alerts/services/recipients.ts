import { request } from '../../../shared/services/http';
import { getSession } from '../../../shared/services/session';
import { roleItem, type CatalogItem } from './catalog';

/**
 * Destinatarios en vivo (MS01, RF-MS01-10): los roles que tienen `ms03:alert:receive`, incluidos los que crea o
 * edita el administrador. `GET /roles/alert-recipients` se autoriza con `ms03:alert:manage` o
 * `ms03:alert:manage_drill`, los mismos permisos que abren este formulario, y solo devuelve nombre y descripción.
 *
 * Se consulta cada vez que se abre el formulario, así un rol recién creado aparece sin recargar la página. La última
 * lista que MS01 entregó queda en memoria de la pestaña: si después MS01 no responde, es el respaldo.
 */
interface AlertRecipientRole { rol: string; descripcion: string }

let lastLoaded: CatalogItem[] | null = null;

export async function loadRecipientRoles(): Promise<CatalogItem[]> {
  const data = await request('/api/v1/roles/alert-recipients', { session: getSession() ?? undefined });
  lastLoaded = ((data ?? []) as AlertRecipientRole[]).map((role) => roleItem(role.rol));
  return lastLoaded;
}

/** Última lista que entregó MS01 en esta pestaña, o null si aún no respondió ninguna vez. */
export const lastRecipientRoles = (): CatalogItem[] | null => lastLoaded;
