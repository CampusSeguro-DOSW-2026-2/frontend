import { useEffect, useState } from 'react';
import type { Session } from '../../../shared/types';
import { peopleApi } from '../services/people';

/** Nombres de las personas (MS01) de la página visible. Sin `enabled` (sin ms01:user:read) no consulta nada. */
export function useUserNames(session: Session, ids: string[], enabled: boolean): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = [...new Set(ids)].sort().join(',');

  useEffect(() => {
    if (!enabled || !key) return undefined;
    let ignore = false;
    Promise.all(key.split(',').map((id) => peopleApi.get(session, id).then((p) => [id, p?.name ?? ''] as const)))
      .then((pairs) => { if (!ignore) setNames(Object.fromEntries(pairs.filter(([, n]) => n))); });
    return () => { ignore = true; };
  }, [session, key, enabled]);

  return names;
}
