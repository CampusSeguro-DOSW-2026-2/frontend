import { useCallback, useEffect, useState } from 'react';
import type { CatalogItem } from '../services/catalog';
import { cachedAlertTypes, loadAlertTypes } from '../services/alertTypes';

const LOAD_ERROR = 'No se pudieron cargar los tipos de alerta desde MS03.';
const STALE_NOTICE = 'MS03 no respondió: se muestran los tipos guardados en este navegador. Se actualizan cuando responda.';

/**
 * Tipos de alerta de MS03 (`GET /api/v1/alertas/tipos`): el catálogo que MS03 replica de MS06 más `OPERATIVA`.
 * Se consulta cada vez que se abre el formulario, así un tipo nuevo aparece sin recargar la página, y cada
 * respuesta reemplaza la copia guardada en el navegador.
 *
 * Si MS03 no responde se usa esa copia (`notice`) para seguir listando; solo si este navegador nunca recibió la
 * lista se muestra `error` sin opciones. `retry` vuelve a consultar, `loading` está activo mientras no hay datos
 * ni error.
 */
export function useAlertTypes() {
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    loadAlertTypes()
      .then((data) => {
        if (ignore) return;
        setItems(data);
        setError('');
        setNotice('');
      })
      .catch((e: unknown) => {
        if (ignore) return;
        const cached = cachedAlertTypes();
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
