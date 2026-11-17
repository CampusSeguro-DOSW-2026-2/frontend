import { ApiError, GENERIC_ERROR, messageOf, request } from '../../../shared/services/http';
import type { FieldErrors } from '../../../shared/services/http';
import { clearSession } from '../../../shared/services/session';
import { MESSAGES } from '../utils/validation';
import type { LoginDraft, RegisterDraft } from '../types';
import type { Session } from '../../../shared/types';

/**
 * Cliente de MS01 (identidad) a través del API Gateway: registro, inicio y cierre de sesión.
 * No usa localStorage de respaldo: registrar una cuenta o iniciar sesión de mentira no tendría sentido.
 */
export { ApiError };
export type { FieldErrors };

// Campo del contrato (JSON) → campo del formulario, para los errores 400 por campo
const REGISTER_FIELDS: Record<string, string> = {
  primer_nombre: 'firstName',
  segundo_nombre: 'secondName',
  primer_apellido: 'firstLastName',
  segundo_apellido: 'secondLastName',
  correo: 'email',
  contrasena: 'password',
  confirmar_contrasena: 'confirmPassword',
};

const LOGIN_FIELDS: Record<string, string> = {
  correo: 'email',
  contrasena: 'password',
};

const configuredWait = Number.parseInt(String(import.meta.env.VITE_REGISTRATION_RESEND_SECONDS ?? ''), 10);

/**
 * Segundos entre dos códigos del registro para el mismo correo. Coincide con la espera de MS01
 * (REGISTRATION_RESEND_COOLDOWN_SECONDS, 60 por defecto): antes de ese tiempo el back responde igual pero no envía otro
 * correo. Se cambia con VITE_REGISTRATION_RESEND_SECONDS; 0 la desactiva.
 */
export const REGISTRATION_RESEND_SECONDS = Number.isNaN(configuredWait) || configuredWait < 0 ? 60 : configuredWait;

const VERIFY_FIELDS: Record<string, string> = {
  correo: 'email',
  codigo: 'code',
};

/** Respuesta del registro: el mensaje y el token que solo recibe quien hizo el registro (RN-MS01-46). */
export interface RegistrationAccepted { message: string; token: string }

/**
 * Solicita el registro (RF-MS01-01 flujo A, F-01): POST /api/v1/auth/register responde 202 y envía un código al
 * correo; la cuenta todavía no existe. Aplica RG-01 (correo recortado y en minúsculas, contraseña intacta) y RG-04
 * (solo envía los campos del contrato). Devuelve el mensaje y el token de registro, que la verificación y el reenvío
 * exigen junto con el código. El token se guarda solo en memoria, nunca en la URL ni en el almacenamiento del navegador.
 */
export async function registerUser(d: RegisterDraft): Promise<RegistrationAccepted> {
  const body: Record<string, string> = {
    primer_nombre: d.firstName.trim(),
    primer_apellido: d.firstLastName.trim(),
    correo: d.email.trim().toLowerCase(),
    contrasena: d.password,
    confirmar_contrasena: d.confirmPassword,
  };
  // Los segundos nombres son opcionales: si están vacíos no se envían
  if (d.secondName.trim()) {
    body.segundo_nombre = d.secondName.trim();
  }
  if (d.secondLastName.trim()) {
    body.segundo_apellido = d.secondLastName.trim();
  }

  try {
    const data = await request('/api/v1/auth/register', { method: 'POST', body, fields: REGISTER_FIELDS });
    const token = typeof data === 'object' && data !== null ? (data as Record<string, unknown>).token_registro : null;
    return { message: messageOf(data, MESSAGES.registerSent), token: typeof token === 'string' ? token : '' };
  } catch (err) {
    // 409 CONFLICTO: el correo ya existe, el mensaje va en el campo del correo
    if (err instanceof ApiError && err.status === 409) {
      err.fields = { ...err.fields, email: MESSAGES.duplicatedEmail };
      err.message = MESSAGES.duplicatedEmail;
    }
    throw err;
  }
}

/**
 * Confirma el correo con el código y crea la cuenta (RF-MS01-01 flujo B, F-14): POST /api/v1/auth/register/verify
 * responde 201 con el usuario creado. Un código incorrecto, vencido o reemplazado, o un token de otro registro,
 * responde 400 CODIGO_INVALIDO con un mensaje genérico; un correo que ya tiene cuenta, 409.
 */
export async function verifyRegistration(email: string, code: string, token: string): Promise<void> {
  const body = { correo: email.trim().toLowerCase(), codigo: code, token_registro: token };
  try {
    await request('/api/v1/auth/register/verify', { method: 'POST', body, fields: VERIFY_FIELDS });
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      err.message = MESSAGES.duplicatedEmail;
    } else if (err instanceof ApiError && err.code === 'CODIGO_INVALIDO') {
      err.fields = { ...err.fields, code: MESSAGES.code };
    }
    throw err;
  }
}

/**
 * Reenvía el código del registro (RF-MS01-01 A1, F-14): POST /api/v1/auth/register/resend. La respuesta es la misma
 * exista o no un registro pendiente. Solo quien hizo el registro (mismo token) recibe un código nuevo. Devuelve el
 * mensaje de confirmación.
 */
export async function resendRegistrationCode(email: string, token: string): Promise<string> {
  const body = { correo: email.trim().toLowerCase(), token_registro: token };
  const data = await request('/api/v1/auth/register/resend', { method: 'POST', body, fields: { correo: 'email' } });
  return messageOf(data, MESSAGES.registerResent);
}

function toSession(data: unknown): Session {
  const body = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const user = body.usuario as Record<string, unknown> | undefined;
  const validToken = typeof body.token === 'string' && body.token !== '';
  const validExpiration = typeof body.expira_en === 'string' && body.expira_en !== '';
  if (!validToken || !validExpiration || !user) {
    throw new ApiError(500, GENERIC_ERROR);
  }

  let roles: string[] = [];
  if (Array.isArray(user.roles)) {
    roles = user.roles.map(String);
  }

  return {
    token: body.token as string,
    tokenType: String(body.tipo ?? 'Bearer'),
    expiresAt: body.expira_en as string,
    user: {
      id: String(user.id),
      email: String(user.correo),
      roles,
    },
  };
}

/**
 * Inicia sesión (RF-MS01-02, F-02). Aplica RG-01 (correo recortado y en minúsculas, contraseña intacta)
 * y RG-04 (solo envía los campos del contrato). El token y su vencimiento los guarda quien llama.
 * 401 (credenciales incorrectas) y 403 (cuenta inactiva) llegan como mensaje global del formulario
 * (RN-MS01-05: sin decir qué dato falló).
 */
export async function loginUser(d: LoginDraft): Promise<Session> {
  const body = {
    correo: d.email.trim().toLowerCase(),
    contrasena: d.password,
  };
  const data = await request('/api/v1/auth/login', { method: 'POST', body, fields: LOGIN_FIELDS });
  return toSession(data);
}

/**
 * Cierra la sesión (RF-MS01-04): POST /api/v1/auth/logout con el token de la sesión, sin cuerpo.
 * El servidor registra el cierre en la auditoría pero no revoca el token (RN-MS01-10): quien cierra
 * la sesión es el cliente, que descarta el token. Por eso la sesión local se elimina siempre, aunque
 * el servidor no responda o el token ya haya vencido, y la salida nunca falla.
 *
 * Devuelve el mensaje de confirmación del servidor, o vacío si no se pudo confirmar.
 */
export async function logoutUser(session: Session): Promise<string> {
  let message = '';
  try {
    const data = await request('/api/v1/auth/logout', { method: 'POST', session, expireOn401: false });
    message = messageOf(data, 'Sesión cerrada.');
  } catch {
    // Sin confirmación del servidor: igual se descarta el token local
  }
  clearSession();
  return message;
}
