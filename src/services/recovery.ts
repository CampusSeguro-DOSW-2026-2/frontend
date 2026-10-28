/**
 * Estado de la recuperación de contraseña entre sus pantallas (correo + código → nueva contraseña).
 *
 * El contrato valida el código junto con la nueva contraseña en una sola llamada (F-05), así que el código
 * que se escribe en la primera pantalla viaja recién en la segunda. Se guarda solo en memoria: nunca en la
 * URL, en localStorage ni en sessionStorage, porque es un secreto de un solo uso.
 */
export interface Recovery {
  email: string;
  code: string;
  /** Mensaje para la pantalla del código cuando se vuelve a ella (por ejemplo, código vencido). */
  error: string;
  /** Instante (ms desde 1970) hasta el cual no se puede pedir otro código; 0 si no hay espera. */
  waitUntil: number;
}

const configured = Number.parseInt(String(import.meta.env.VITE_RECOVERY_RESEND_SECONDS ?? ''), 10);

/**
 * Segundos que deben pasar entre dos solicitudes de código de la misma cuenta. Coincide con la espera de MS01
 * (RECOVERY_RESEND_COOLDOWN_SECONDS, 60 por defecto): una solicitud antes de ese tiempo recibe la misma
 * respuesta pero no genera otro correo. Se cambia con VITE_RECOVERY_RESEND_SECONDS; 0 la desactiva.
 */
export const RESEND_SECONDS = Number.isNaN(configured) || configured < 0 ? 60 : configured;

let current: Recovery | null = null;

/** Guarda el correo, el código y la espera vigente para la pantalla de la nueva contraseña. */
export function saveRecovery(email: string, code: string, error = '', waitUntil = 0): void {
  current = { email, code, error, waitUntil };
}

/** Estado vigente de la recuperación, o null si no hay una en curso. */
export function readRecovery(): Recovery | null {
  return current;
}

/** Descarta el estado (al terminar la recuperación o al empezar una nueva). */
export function clearRecovery(): void {
  current = null;
}