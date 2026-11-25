import { useEffect, useState } from 'react';
import type { Session } from '../../../shared/types';
import { eventsApi } from '../../ms06-drills/services/events';

/**
 * Nombres de los eventos (de MS06) para las pantallas de varios eventos: MS08 solo devuelve ids. Si MS06 no
 * responde o el usuario no puede leer el evento, la pantalla muestra el id corto.
 */
export function useEventNames(session: Session, ids: string[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = ids.join(',');

  useEffect(() => {
    let ignore = false;
    Promise.all(key.split(',').filter(Boolean).map((id) =>
      eventsApi.detail(session, id).then((d) => [id, d.event.name] as const).catch(() => null)))
      .then((pairs) => {
        if (!ignore) setNames(Object.fromEntries(pairs.filter((p): p is readonly [string, string] => p !== null)));
      });
    return () => { ignore = true; };
  }, [session, key]);

  return names;
}

/** Nombre del evento, o su id corto mientras no haya nombre. */
export const eventName = (names: Record<string, string>, id: string) => names[id] ?? `Evento ${id.slice(0, 8)}`;

/** Ruta de una pantalla de varios eventos: #/indicadores/{vista}/{id1,id2,...}. */
export const multiEventHref = (view: 'comparar' | 'ubicaciones', ids: string[]) => `#/indicadores/${view}/${ids.join(',')}`;
