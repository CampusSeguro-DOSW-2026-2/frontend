import { ApiError, GENERIC_ERROR, messageOf, request } from './http';
import type { FieldErrors } from './http';
import { clearSession } from './session';
import { MESSAGES } from '../utils/validation';
import type { LoginDraft, RegisterDraft, Session } from '../types';

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

/**
 * Registra a un usuario (RF-MS01-01, F-01). Aplica RG-01 (correo recortado y en minúsculas, contraseña
 * intacta) y RG-04 (solo envía los campos del contrato). Crea la cuenta ACTIVA con rol ESTUDIANTE y no
 * inicia sesión.
 */
export async function registerUser(d: RegisterDraft): Promise<void> {
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
    await request('/api/v1/auth/register', { method: 'POST', body, fields: REGISTER_FIELDS });
  } catch (err) {
    // 409 CONFLICTO: el correo ya existe, el mensaje va en el campo del correo
    if (err instanceof ApiError && err.status === 409) {
      err.fields = { ...err.fields, email: MESSAGES.duplicatedEmail };
      err.message = MESSAGES.duplicatedEmail;
    }
    throw err;
  }
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
