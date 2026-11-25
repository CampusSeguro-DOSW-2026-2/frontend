import { request } from '../../../shared/services/http';
import { getSession } from '../../../shared/services/session';
import { read, write } from '../../../shared/services/localStore';
import { OPERATIONAL_TYPE, type CatalogItem } from './catalog';

/**
 * Tipos de alerta en vivo (MS03, S6): `GET /api/v1/alertas/tipos` devuelve los tipos activos del catálogo que
 * MS03 replica de MS06, más `OPERATIVA` (el tipo local de MS03). MS06 es el dueño del catálogo.
 *
 * La última lista que entregó MS03 se guarda en el navegador y se reemplaza en cada consulta exitosa. Si MS03 no
 * responde, el formulario usa esa copia para seguir mostrando tipos; nunca inventa códigos que MS03 no haya
 * entregado alguna vez.
 */
interface AlertTypeDto { code: string; label: string; displayOrder: number }

const CACHE_KEY = 'cs.ms03.alertTypes';
const MAX_TYPES = 50;

const isTypeDto = (value: unknown): value is AlertTypeDto => {
  if (typeof value !== 'object' || value === null) return false;
  const dto = value as Partial<AlertTypeDto>;
  return typeof dto.code === 'string' && dto.code.trim() !== ''
    && typeof dto.label === 'string' && dto.label.trim() !== ''
    && typeof dto.displayOrder === 'number';
};

const isCatalogItem = (value: unknown): value is CatalogItem => {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<CatalogItem>;
  return typeof item.id === 'string' && item.id.trim() !== '' && typeof item.label === 'string';
};

/** OPERATIVA se agrupa aparte porque es una alerta logística, no una emergencia. */
const toItem = (dto: AlertTypeDto): CatalogItem => ({
  id: dto.code,
  label: dto.label,
  group: dto.code === OPERATIONAL_TYPE ? 'Operativa' : 'Emergencia',
});

function saveTypes(items: CatalogItem[]) {
  try {
    write(CACHE_KEY, { items, savedAt: new Date().toISOString() });
  } catch {
    // Sin almacenamiento (navegación privada, cuota): la consulta en vivo sigue funcionando igual.
  }
}

function readCachedTypes(): CatalogItem[] | null {
  const cached = read<{ items?: unknown } | null>(CACHE_KEY, null);
  if (!cached || !Array.isArray(cached.items)) {
    return null;
  }
  return cached.items.filter(isCatalogItem).slice(0, MAX_TYPES);
}

/** Copia guardada de la última lista que entregó MS03, o null si este navegador nunca la recibió. */
export function cachedAlertTypes(): CatalogItem[] | null {
  const items = readCachedTypes();
  return items && items.length ? items : null;
}

export async function loadAlertTypes(): Promise<CatalogItem[]> {
  const data = await request('/api/v1/alertas/tipos', { session: getSession() ?? undefined });
  if (!Array.isArray(data)) {
    throw new Error('No se pudieron leer los tipos de alerta. Intente de nuevo más tarde.');
  }
  const items = data.filter(isTypeDto).map(toItem);
  // Un catálogo vacío no debe borrar la copia guardada: sin tipos el formulario no puede crear alertas.
  if (!items.length) {
    throw new Error('Todavía no hay tipos de alerta disponibles.');
  }
  saveTypes(items);
  return items;
}
