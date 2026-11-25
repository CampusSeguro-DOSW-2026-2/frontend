import { useEffect, useState } from 'react';

/** Intervalo de actualización de las pantallas en vivo (el mismo de «Ver en vivo» y de Alertas). */
export const LIVE_REFRESH_MS = 15000;

/**
 * Contador que sube cada `ms` mientras `enabled` y la pestaña esté visible, y también al volver a la pestaña. Se pasa
 * como dependencia de las consultas para que la pantalla se actualice sola, sin recargar la página.
 */
export function useAutoRefresh(enabled = true, ms = LIVE_REFRESH_MS): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const bump = () => { if (document.visibilityState === 'visible') setTick((n) => n + 1); };
    const timer = window.setInterval(bump, ms);
    document.addEventListener('visibilitychange', bump);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', bump); };
  }, [enabled, ms]);
  return tick;
}
