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

/**
 * Nombres de todos los edificios y zonas, incluidos los inactivos, solo para mostrar el nombre de un lugar que ya
 * no se ofrece (por ejemplo, el alcance de un evento antiguo). Si falla, se usan los nombres de los activos.
 */
const allNames = (): Promise<Record<string, string>> =>
  Promise.all([campus.edificios.listar(true), campus.zonas.listar(true)])
    .then(([buildings, zones]) => Object.fromEntries([
      ...buildings.map((b) => [b.id, b.nombre] as const),
      ...zones.map((z) => [z.id, z.nombre || z.codigo] as const),
    ]))
    .catch(() => ({}));

export function loadScopeCatalog(): Promise<ScopeCatalog> {
  if (!cached) {
    cached = Promise.all([campus.edificios.listar(), campus.zonas.listar(), allNames()])
      .then(([buildings, zones, names]) => ({
        buildings: buildings.map((building) => ({ id: building.id, label: building.nombre, group: 'Edificios' })),
        zones: zones.map((zone) => ({ id: zone.id, label: zone.nombre || zone.codigo, group: 'Zonas' })),
        names,
      }))
      .catch((error: unknown) => {
        cached = null;
        throw error;
      });
  }
  return cached;
}
