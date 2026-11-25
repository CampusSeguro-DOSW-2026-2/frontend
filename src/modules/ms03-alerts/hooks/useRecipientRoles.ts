import { useCallback, useEffect, useState } from 'react';
import type { CatalogItem } from '../services/catalog';
import { cachedRecipientRoles, loadRecipientRoles } from '../services/recipients';

const LOAD_ERROR = 'No se pudieron cargar los destinatarios.';
const STALE_NOTICE = 'El servicio de usuarios no respondió: se muestran los destinatarios guardados en este navegador. Se actualizan cuando responda.';

/**
 * Roles destinatarios de MS01 (`GET /api/v1/roles/alert-recipients`), los que tienen `ms03:alert:receive`. Se consulta
 * cada vez que se abre el formulario, así un rol recién creado aparece sin recargar la página, y cada respuesta
 * reemplaza la copia guardada en el navegador.
 *
 * Si MS01 no responde se usa esa copia (`notice`) para seguir listando; solo si este navegador nunca recibió la lista
 * se muestra `error` sin opciones. `retry` vuelve a consultar, `loading` está activo mientras no hay datos ni error.
 */
export function useRecipientRoles() {
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    loadRecipientRoles()
      .then((data) => {
        if (ignore) return;
        setItems(data);
        setError('');
        setNotice('');
      })
      .catch((e: unknown) => {
        if (ignore) return;
        const cached = cachedRecipientRoles();
        if (cached) {
          setItems(cached);
          setNotice(STALE_NOTICE);
          return;
        }
        setError(e instanceof Error && e.message ? e.message : LOAD_ERROR);
      });
    return () => { ignore = true; };
  }, [attempt]);

  const retry = useCallback(() => {
    setError('');
    setNotice('');
    setAttempt((n) => n + 1);
  }, []);

  return { items: items ?? [], loading: items === null && error === '', error, notice, retry };
}
