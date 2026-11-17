import { useEffect } from 'react';
import { request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';

// Cada cuánto se revisa la sesión mientras la pestaña está visible
const CHECK_INTERVAL_MS = 60_000;

/**
 * Detecta que la sesión dejó de ser válida aunque la pantalla no haga peticiones (RF-MS01-11): un cambio de roles, de
 * los permisos de un rol o del estado de la cuenta hace que el Gateway rechace el token anterior con 401. Revisa al
 * cambiar de pantalla, al volver a la pestaña y cada minuto con GET /users/me, que todo rol puede consultar
 * (RN-MS01-41). Ante un 401 el cliente HTTP cierra la sesión y envía al inicio de sesión con el aviso; cualquier otro
 * error (por ejemplo, MS01 caído) se ignora: la sesión sigue y cada pantalla muestra su propio error.
 */
export function useSessionGuard(session: Session | null, route: string): void {
  useEffect(() => {
    if (!session) {
      return undefined;
    }
    const check = () => {
      if (document.visibilityState === 'visible') {
        request('/api/v1/users/me', { session }).catch(() => {
          // El 401 ya lo atendió el cliente HTTP; los demás errores no cierran la sesión
        });
      }
    };
    check();
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [session, route]);
}
