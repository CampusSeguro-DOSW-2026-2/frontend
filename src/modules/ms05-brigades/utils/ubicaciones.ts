import type { ScopeCatalog } from '../../ms03-alerts/services/catalog';
import { scopeLabelIn } from '../../ms06-drills/utils/labels';

/**
 * Nombre visible de un edificio o zona. MS05 solo guarda el id del alcance del evento (MS06 solo le envía los ids),
 * así que se resuelve con el catálogo vivo de MS02, el mismo que usan "Solicitar ayuda" y "Mis incidentes". Si el
 * catálogo aún no llegó o no conoce el id, se usa el nombre que haya enviado MS05 (cuando no es el propio id) y, por
 * último, el id, para no ocultar nada.
 */
export function nombreUbicacion(
  id: string | null | undefined,
  nombreMs05: string | null | undefined,
  catalog: ScopeCatalog | null | undefined,
): string {
  if (!id) return '';
  const delCatalogo = scopeLabelIn(id, catalog);
  if (delCatalogo !== id) return delCatalogo;
  const enviado = nombreMs05?.trim();
  return enviado && enviado !== id ? enviado : id;
}
