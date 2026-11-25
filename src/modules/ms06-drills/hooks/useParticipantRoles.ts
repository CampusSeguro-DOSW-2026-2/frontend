import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/services/http';
import { cachedParticipantRoles, loadParticipantRoles, type ParticipantItem } from '../services/participants';

const LOAD_ERROR = 'No se pudieron cargar los participantes.';
const STALE_NOTICE = 'El servicio de usuarios no respondió: se muestran los participantes guardados en este navegador. Se actualizan cuando responda.';

/**
 * Roles que MS06 acepta como participantes (`GET /api/v1/roles/alert-recipients` de MS01, el mismo que usa MS03), los
 * que reciben las alertas del evento. Se consulta cada vez que se abre el formulario, así un rol recién creado
 * aparece sin recargar la página, y cada respuesta reemplaza la copia guardada en el navegador.
 *
 * Si MS01 no responde se usa esa copia (`notice`) para seguir listando; solo si este navegador nunca recibió la lista
 * se muestra `error` sin opciones. `retry` vuelve a consultar, `loading` está activo mientras no hay datos ni error.
 */
export function useParticipantRoles() {
  const [items, setItems] = useState<ParticipantItem[] | null>(null);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState(0);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    loadParticipantRoles()
      .then((data) => {
        if (ignore) return;
        setItems(data);
        setError('');
        setErrorStatus(0);
        setNotice('');
      })
      .catch((e: unknown) => {
        if (ignore) return;
        setErrorStatus(e instanceof ApiError ? e.status : 0);
        const cached = cachedParticipantRoles();
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
    setErrorStatus(0);
    setNotice('');
    setAttempt((n) => n + 1);
  }, []);

  return { items: items ?? [], loading: items === null && error === '', error, errorStatus, notice, retry };
}
