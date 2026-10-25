export const MS03_URL = (import.meta.env.VITE_MS03_URL as string | undefined) ?? 'http://localhost:8080';

export interface ErrorDetail { field: string; message: string }
export class ApiError extends Error {
  status: number;
  code: string;
  details: ErrorDetail[];
  constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message); this.status = status; this.code = code; this.details = details;
  }
}

// MS03 responde los mensajes en inglés; la interfaz los muestra en español según el código.
const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Revisa los campos marcados.',
  INVALID_ACTIVATION_DATE: 'La fecha de inicio debe ser futura.',
  INVALID_ALERT_STATE: 'La alerta ya no se puede modificar en su estado actual.',
  INVALID_TRANSITION: 'La alerta ya no admite esa acción en su estado actual.',
  ALERT_NOT_FOUND: 'La alerta no existe.',
  UNAUTHORIZED: 'Tu sesión no es válida. Vuelve a iniciar sesión.',
  FORBIDDEN: 'No tienes permiso para realizar esta acción.',
  CONCURRENT_MODIFICATION: 'Otra persona modificó la alerta. Recarga e inténtalo de nuevo.',
  EXTERNAL_SERVICE_UNAVAILABLE: 'Un servicio del campus no está disponible. Inténtalo más tarde.',
  INVALID_REFERENCE: 'Algún edificio, zona o destinatario no existe en el catálogo.',
  NOT_A_RECIPIENT: 'No eres destinatario de esta alerta.',
  ALERT_NOT_ACTIVE: 'La alerta no está activa.',
  INTERNAL_ERROR: 'El servicio de alertas tuvo un error. Inténtalo más tarde.',
};
const byStatus = (s: number) => {
  if (s >= 500) return MESSAGES.INTERNAL_ERROR;
  return `No se pudo completar la operación (error ${s}).`;
};

// SOLO DESARROLLO: /local/tokens existe únicamente con el perfil `local` de MS03.
// Se reemplaza por el JWT real de MS01 cuando exista.
let devToken: Promise<string> | null = null;
const getToken = () => {
  devToken ??= fetch(`${MS03_URL}/local/tokens`)
    .then((r) => { if (!r.ok) throw new Error(`tokens ${r.status}`); return r.json(); })
    .then((t: Record<string, string>) => t.COORDINATOR)
    .catch((e) => { devToken = null; throw e; });
  return devToken;
};

export async function ms03<T>(method: string, path: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    const token = await getToken();
    r = await fetch(`${MS03_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No se pudo conectar con el servicio de alertas.');
  }
  if (!r.ok) {
    let code = 'ERROR', details: ErrorDetail[] = [];
    try { const j = await r.json(); code = j.code ?? code; details = j.details ?? []; } catch { /* sin cuerpo */ }
    throw new ApiError(r.status, code, MESSAGES[code] ?? byStatus(r.status), details);
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}
