import { useCallback, useEffect, useState } from 'react';
import type { CatalogItem } from '../services/catalog';
import { loadRecipientRoles } from '../services/recipients';

const LOAD_ERROR = 'No se pudieron cargar los destinatarios desde MS01.';

/**
 * Roles destinatarios de MS01 (`GET /api/v1/roles/alert-recipients`), los que tienen `ms03:alert:receive`. Se consulta
 * cada vez que se abre el formulario, así un rol recién creado aparece sin recargar la página.
 *
 * Si MS01 no responde no se inventan opciones: `error` explica el fallo y `retry` vuelve a consultar. `loading` está
 * activo mientras no hay datos ni error.
 */
export function useRecipientRoles() {
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    loadRecipientRoles()
      .then((data) => { if (!ignore) setItems(data); })
      .catch((e: unknown) => {
        if (ignore) return;
        setError(e instanceof Error && e.message ? e.message : LOAD_ERROR);
      });
    return () => { ignore = true; };
  }, [attempt]);

  const retry = useCallback(() => {
    setError('');
    setAttempt((n) => n + 1);
  }, []);

  return { items: items ?? [], loading: items === null && error === '', error, retry };
}
