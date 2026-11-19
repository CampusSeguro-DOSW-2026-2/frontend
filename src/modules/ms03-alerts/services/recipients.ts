import { request } from '../../../shared/services/http';
import { getSession } from '../../../shared/services/session';
import { roleItem, type CatalogItem } from './catalog';

/**
 * Destinatarios en vivo (MS01, RF-MS01-10): los roles que tienen `ms03:alert:receive`, incluidos los que crea o
 * edita el administrador. `GET /roles/alert-recipients` se autoriza con `ms03:alert:manage` o
 * `ms03:alert:manage_drill`, los mismos permisos que abren este formulario, y solo devuelve nombre y descripción.
 *
 * No hay lista de respaldo en el código: si MS01 no responde el formulario avisa y permite reintentar, nunca ofrece
 * roles que MS01 no haya confirmado.
 */
interface AlertRecipientRole { rol: string; descripcion: string }

export async function loadRecipientRoles(): Promise<CatalogItem[]> {
  const data = await request('/api/v1/roles/alert-recipients', { session: getSession() ?? undefined });
  return ((data ?? []) as AlertRecipientRole[]).map((role) => roleItem(role.rol));
}
