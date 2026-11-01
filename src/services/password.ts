import { messageOf, request } from './http';
import { MESSAGES } from '../utils/validation';
import type { PasswordChangeDraft, Session } from '../types';

/**
 * Cliente de MS01 para recuperar y cambiar la contraseña (RF-MS01-08), a través del API Gateway.
 *
 * - F-04 y F-05 son rutas públicas (no llevan token): la persona olvidó su contraseña y no puede iniciar sesión.
 * - F-06 es una ruta protegida (permiso ms01:password:change): lleva el token de la sesión.
 */

const FORGOT_FIELDS: Record<string, string> = {
  correo: 'email',
};

const RESET_FIELDS: Record<string, string> = {
  correo: 'email',
  codigo: 'code',
  nueva_contrasena: 'password',
  confirmar_nueva_contrasena: 'confirmPassword',
};

const CHANGE_FIELDS: Record<string, string> = {
  contrasena_actual: 'current',
  nueva_contrasena: 'next',
  confirmar_nueva_contrasena: 'confirm',
};

/**
 * Pide el código de recuperación (F-04): POST /api/v1/auth/password/forgot { correo }.
 * La respuesta es la misma exista o no el correo (RN-MS01-20); el 200 solo significa "solicitud recibida".
 * Devuelve el mensaje de confirmación.
 */
export async function requestPasswordCode(email: string): Promise<string> {
  const body = { correo: email.trim().toLowerCase() };
  const data = await request('/api/v1/auth/password/forgot', { method: 'POST', body, fields: FORGOT_FIELDS });
  return messageOf(data, MESSAGES.forgotSent);
}

/** Datos de F-05: correo, código de 6 dígitos y la nueva contraseña con su confirmación. */
export interface PasswordResetData {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

/**
 * Restablece la contraseña con el código (F-05): POST /api/v1/auth/password/reset.
 * El código viaja como texto (puede empezar por cero). Un código incorrecto, vencido o ya usado responde
 * 400 CODIGO_INVALIDO con un mensaje genérico. Tras el éxito la persona debe iniciar sesión de nuevo.
 * Devuelve el mensaje de confirmación.
 */
export async function resetPassword(d: PasswordResetData): Promise<string> {
  const body = {
    correo: d.email.trim().toLowerCase(),
    codigo: d.code,
    nueva_contrasena: d.password,
    confirmar_nueva_contrasena: d.confirmPassword,
  };
  const data = await request('/api/v1/auth/password/reset', { method: 'POST', body, fields: RESET_FIELDS });
  return messageOf(data, 'Contraseña actualizada.');
}

/**
 * Cambia la contraseña de la persona autenticada (F-06): PUT /api/v1/users/me/password.
 * Contraseña actual incorrecta, nueva inválida o igual a la actual, o confirmación distinta responden 400.
 * Devuelve el mensaje de confirmación.
 */
export async function changeMyPassword(session: Session, d: PasswordChangeDraft): Promise<string> {
  const body = {
    contrasena_actual: d.current,
    nueva_contrasena: d.next,
    confirmar_nueva_contrasena: d.confirm,
  };
  const data = await request('/api/v1/users/me/password', { method: 'PUT', body, session, fields: CHANGE_FIELDS });
  return messageOf(data, 'Contraseña actualizada.');
}
