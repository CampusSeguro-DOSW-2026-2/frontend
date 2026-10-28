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
}

let current: Recovery | null = null;

/** Guarda el correo y el código para la pantalla de la nueva contraseña. */
export function saveRecovery(email: string, code: string, error = ''): void {
  current = { email, code, error };
}

/** Estado vigente de la recuperación, o null si no hay una en curso. */
export function readRecovery(): Recovery | null {
  return current;
}

/** Descarta el estado (al terminar la recuperación o al empezar una nueva). */
export function clearRecovery(): void {
  current = null;
}
