import { useCallback, useEffect, useState } from 'react';
import { loadAlertFilters, type AlertFilterGroup } from '../services/alertFilters';

const LOAD_ERROR = 'No se pudieron cargar los filtros de alertas.';

/**
 * Grupos de filtros de MS03 (`GET /api/v1/alertas/filtros`) que el listado renderiza como botones. Se consulta al
 * montar, sin copia en el navegador: cada respuesta reemplaza los grupos.
 *
 * Si MS03 no responde, este hook solo reporta `error`; el listado sigue cargando sus alertas sin filtros.
 * `retry` vuelve a consultar y `loading` está activo mientras no hay grupos ni error.
 */
export function useAlertFilters() {
  const [groups, setGroups] = useState<AlertFilterGroup[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    loadAlertFilters()
      .then((data) => {
        if (ignore) return;
        setGroups(data);
        setError('');
      })
      .catch((e: unknown) => {
        if (ignore) return;
        setGroups([]);
        setError(e instanceof Error && e.message ? e.message : LOAD_ERROR);
      });
    return () => { ignore = true; };
  }, [attempt]);

  const retry = useCallback(() => {
    setError('');
    setGroups(null);
    setAttempt((n) => n + 1);
  }, []);

  return { groups: groups ?? [], loading: groups === null && error === '', error, retry };
}
