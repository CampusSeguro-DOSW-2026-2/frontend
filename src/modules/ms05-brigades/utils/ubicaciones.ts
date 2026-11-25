import type { ScopeCatalog } from '../../ms03-alerts/services/catalog';
import { UNKNOWN_PLACE } from '../../ms03-alerts/services/catalog';
import { hasPlaceName, scopeLabelIn } from '../../ms06-drills/utils/labels';
import { isTechnicalId } from '../../../shared/utils/text';

/**
 * Nombre visible de un edificio o zona. MS05 solo guarda el id del alcance del evento (MS06 solo le envía los ids),
 * así que se resuelve con el catálogo vivo de MS02, el mismo que usan "Solicitar ayuda" y "Mis incidentes". Si el
 * catálogo no conoce el id, se usa el nombre que haya enviado MS05 (cuando no es un id) y, por último, un texto
 * genérico: el id nunca se muestra.
 */
export function nombreUbicacion(
  id: string | null | undefined,
  nombreMs05: string | null | undefined,
  catalog: ScopeCatalog | null | undefined,
): string {
  if (!id) return '';
  if (hasPlaceName(id, catalog)) return scopeLabelIn(id, catalog);
  return isTechnicalId(nombreMs05) ? UNKNOWN_PLACE : nombreMs05!.trim();
}
