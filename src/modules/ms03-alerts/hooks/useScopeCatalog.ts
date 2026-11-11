import { useCallback, useEffect, useState } from 'react';
import type { ScopeCatalog } from '../services/catalog';
import { loadScopeCatalog } from '../services/scope';

const LOAD_ERROR = 'No se pudieron cargar los edificios y zonas del campus.';

/** Catálogo de alcance de MS02 compartido: `loading` mientras no hay datos ni error, `retry` reintenta. */
export function useScopeCatalog(enabled = true) {
  const [catalog, setCatalog] = useState<ScopeCatalog | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false;
    loadScopeCatalog()
      .then((data) => { if (!ignore) setCatalog(data); })
      .catch((e: unknown) => {
        if (ignore) return;
        setError(e instanceof Error && e.message ? e.message : LOAD_ERROR);
      });
    return () => { ignore = true; };
  }, [attempt, enabled]);

  const retry = useCallback(() => {
    setError('');
    setAttempt((n) => n + 1);
  }, []);

  return { catalog, loading: enabled && catalog === null && error === '', error, retry };
}
