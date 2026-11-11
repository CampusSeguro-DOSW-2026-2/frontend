import { campus } from '../../ms02-campus/services/campus';
import type { ScopeCatalog } from './catalog';

/**
 * Catálogo de alcance en vivo (MS02).
 *
 * MS03 valida BUILDING y ZONE contra MS02 por UUID (`RestCampusScopeClient`), así que el formulario
 * no puede ofrecer ids de demostración: las opciones salen de los mismos endpoints que MS03 consulta
 * al crear la alerta. `GET /buildings` y `GET /safe-zones` devuelven solo los activos y exigen
 * `ms02:campus:read`, el mismo permiso que MS03 pide al validar el alcance.
 *
 * La promesa se comparte entre pantallas para no repetir la consulta; un fallo no se memoriza.
 */
let cached: Promise<ScopeCatalog> | null = null;

export function loadScopeCatalog(): Promise<ScopeCatalog> {
  if (!cached) {
    cached = Promise.all([campus.edificios.listar(), campus.zonas.listar()])
      .then(([buildings, zones]) => ({
        buildings: buildings.map((building) => ({ id: building.id, label: building.nombre, group: 'Edificios' })),
        zones: zones.map((zone) => ({ id: zone.id, label: zone.nombre || zone.codigo, group: 'Zonas' })),
      }))
      .catch((error: unknown) => {
        cached = null;
        throw error;
      });
  }
  return cached;
}
