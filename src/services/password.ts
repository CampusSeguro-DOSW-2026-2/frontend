import type { Session } from '../types';
import { call } from './users';

/**
 * Recuperación de contraseña (MS01 · RF-MS01-08, flujo A, endpoints públicos).
 *   POST /api/v1/auth/password/forgot  → envía el código al correo (siempre 200, no revela si existe)
 *   POST /api/v1/auth/password/reset   → valida el código y cambia la contraseña
 * Los errores llegan como ErrorResponse: { status, codigo, mensaje, errores: [{ campo, mensaje }] }.
 */
const MS01_URL = (import.meta.env.VITE_MS01_URL as string | undefined) ?? 'http://localhost:8080';

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intenta de nuevo en unos minutos.';
const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';

export type ResetField = 'email' | 'code' | 'password' | 'confirm' | 'current';
export type ResetFieldErrors = Partial<Record<ResetField, string>>;

export class PasswordError extends Error {
  status: number;
  /** Código del back (VALIDACION, CODIGO_INVALIDO…); vacío si no llegó. */
  codigo: string;
  fields: ResetFieldErrors;

  constructor(status: number, message: string, codigo = '', fields: ResetFieldErrors = {}) {
    super(message);
    this.status = status;
    this.codigo = codigo;
    this.fields = fields;
  }
}

const FIELD_MAP: Record<string, ResetField> = {
  correo: 'email',
  codigo: 'code',
  contrasena_actual: 'current',
  nueva_contrasena: 'password',
  confirmar_nueva_contrasena: 'confirm',
};

async function post(path: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(`${MS01_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PasswordError(0, NETWORK_ERROR);
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) {
    return data;
  }
  throw toError(res.status, data);
}

function toError(status: number, data: Record<string, unknown>): PasswordError {
  const fields: ResetFieldErrors = {};
  if (Array.isArray(data.errores)) {
    for (const item of data.errores) {
      const detail = item as Record<string, unknown>;
      const field = FIELD_MAP[String(detail.campo)];
      if (field && typeof detail.mensaje === 'string') {
        fields[field] = detail.mensaje;
      }
    }
  }

  let message = UNEXPECTED_ERROR;
  if (typeof data.mensaje === 'string' && data.mensaje.trim() !== '') {
    message = data.mensaje;
  }
  const codigo = typeof data.codigo === 'string' ? data.codigo : '';

  // El back asocia "las contraseñas no coinciden" al campo de confirmación (400 sin errores[])
  if (status === 400 && message === 'Las contraseñas no coinciden.' && !fields.confirm) {
    fields.confirm = message;
  }
  return new PasswordError(status, message, codigo, fields);
}

/** Pide el código de recuperación. La respuesta es la misma exista o no el correo. */
export async function requestResetCode(email: string): Promise<string> {
  const data = await post('/api/v1/auth/password/forgot', { correo: email.trim().toLowerCase() });
  return typeof data.mensaje === 'string' ? data.mensaje : 'Si el correo está registrado, enviamos un código de recuperación.';
}

export interface ResetInput {
  email: string;
  code: string;
  password: string;
  confirm: string;
}

/** Cambia la contraseña con el código recibido. RG-04: solo se envían los campos del contrato. */
export async function resetPassword(d: ResetInput): Promise<string> {
  const data = await post('/api/v1/auth/password/reset', {
    correo: d.email.trim().toLowerCase(),
    codigo: d.code,
    nueva_contrasena: d.password,
    confirmar_nueva_contrasena: d.confirm,
  });
  return typeof data.mensaje === 'string' ? data.mensaje : 'Contraseña actualizada correctamente. Inicia sesión de nuevo.';
}

export interface ChangeInput {
  current: string;
  password: string;
  confirm: string;
}

/**
 * Cambio de contraseña con la sesión iniciada (PUT /api/v1/users/me/password).
 * La identidad va en X-User-Id / X-User-Role (las pone `call` desde la sesión), nunca en el cuerpo.
 */
export async function changePassword(session: Session, d: ChangeInput): Promise<string> {
  let result;
  try {
    result = await call(session, '/api/v1/users/me/password', {
      method: 'PUT',
      body: {
        contrasena_actual: d.current,
        nueva_contrasena: d.password,
        confirmar_nueva_contrasena: d.confirm,
      },
    });
  } catch {
    throw new PasswordError(0, NETWORK_ERROR);
  }
  if (!result.res.ok) {
    throw toError(result.res.status, result.data);
  }
  const m = result.data.mensaje;
  return typeof m === 'string' ? m : 'Contraseña actualizada correctamente.';
}

// ---------------------------------------------------------------------------
// Datos entre las dos pantallas (correo + código → nueva contraseña).
// Se guardan en sessionStorage (no en localStorage) para que sobrevivan a recargar la pestaña
// pero no queden en el navegador después de cerrarla.
// ---------------------------------------------------------------------------
const PENDING_KEY = 'campusseguro.reset';
let memoryPending: { email: string; code: string } | null = null;

export function savePendingReset(email: string, code: string): void {
  memoryPending = { email, code };
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(memoryPending));
  } catch {
    // Sin almacenamiento: queda solo en memoria
  }
}

export function getPendingReset(): { email: string; code: string } | null {
  if (memoryPending) {
    return memoryPending;
  }
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as { email: string; code: string }) : null;
  } catch {
    return null;
  }
}

export function clearPendingReset(): void {
  memoryPending = null;
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Nada que borrar
  }
}
