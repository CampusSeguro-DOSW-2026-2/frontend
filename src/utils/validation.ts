/**
 * Reglas de entrada de MS01 (documento de formularios F-01 a F-06) con sus mensajes textuales.
 * El back sigue siendo quien decide: el front las repite para avisar antes de enviar y usa los mismos
 * mensajes que el back, de modo que el usuario ve lo mismo con o sin viaje al servidor.
 *
 * RG-01: los textos se recortan antes de validar y el correo se normaliza a minúsculas; la contraseña
 * no se recorta ni se normaliza.
 */

// Letras (con tildes y ñ), espacios, guion y apóstrofe
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;

// 8 a 64 caracteres, sin espacios, con mayúscula, minúscula, número y carácter especial
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s])\S{8,64}$/;

// Dominios institucionales permitidos en el registro
const INSTITUTIONAL_EMAIL = /^[A-Za-z0-9._%+-]+@(mail\.)?escuelaing\.edu\.co$/i;

// Formato de correo del login y la recuperación: el dominio lo decide el back
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CODE_PATTERN = /^[0-9]{6}$/;

const EMAIL_MAX_LENGTH = 100;
const PASSWORD_MAX_LENGTH = 64;

export const MESSAGES = {
  firstName: 'El primer nombre debe tener entre 2 y 30 letras.',
  secondName: 'El segundo nombre debe tener entre 2 y 30 letras.',
  firstLastName: 'El primer apellido debe tener entre 2 y 30 letras.',
  secondLastName: 'El segundo apellido debe tener entre 2 y 30 letras.',
  registerEmail: 'Correo no válido.',
  duplicatedEmail: 'El correo ya está registrado.',
  email: 'Ingrese un correo válido.',
  password: 'La contraseña debe tener 8 a 64 caracteres, con mayúscula, minúscula, número y carácter especial.',
  mismatch: 'Las contraseñas no coinciden.',
  loginPassword: 'Ingrese su contraseña.',
  loginPasswordLength: 'La contraseña no puede superar los 64 caracteres.',
  currentPassword: 'Ingrese su contraseña actual.',
  newPassword: 'La nueva contraseña no cumple la política o es igual a la actual.',
  code: 'Código incorrecto o vencido.',
  forgotSent: 'Si el correo está registrado, enviamos un código de recuperación.',
} as const;

export type NameField = 'firstName' | 'secondName' | 'firstLastName' | 'secondLastName';

/** Nombres y apellidos (F-01 y F-03): 2 a 30 letras; el segundo nombre y el segundo apellido son opcionales. */
export function nameError(field: NameField, value: string): string {
  const optional = field === 'secondName' || field === 'secondLastName';
  const name = value.trim();
  if (name === '') {
    if (optional) {
      return '';
    }
    return MESSAGES[field];
  }
  if (name.length < 2 || name.length > 30 || !NAME_PATTERN.test(name)) {
    return MESSAGES[field];
  }
  return '';
}

/** Correo del registro (F-01): formato válido, dominio institucional y hasta 100 caracteres. */
export function registerEmailError(value: string): string {
  const email = value.trim();
  if (email.length > EMAIL_MAX_LENGTH || !INSTITUTIONAL_EMAIL.test(email)) {
    return MESSAGES.registerEmail;
  }
  return '';
}

/** Correo del login y de la recuperación (F-02, F-04 y F-05): formato válido y hasta 100 caracteres. */
export function emailFormatError(value: string): string {
  const email = value.trim();
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_FORMAT.test(email)) {
    return MESSAGES.email;
  }
  return '';
}

/** Política de contraseña (F-01, F-05 y F-06). */
export function passwordPolicyError(value: string): string {
  if (!PASSWORD_PATTERN.test(value)) {
    return MESSAGES.password;
  }
  return '';
}

/** La confirmación debe ser idéntica a la contraseña (F-01, F-05 y F-06). */
export function confirmationError(password: string, confirmation: string): string {
  if (confirmation !== password) {
    return MESSAGES.mismatch;
  }
  return '';
}

/** Contraseña del login (F-02): no vacía y de hasta 64 caracteres; no se revalida la política. */
export function loginPasswordError(value: string): string {
  if (value.trim() === '') {
    return MESSAGES.loginPassword;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return MESSAGES.loginPasswordLength;
  }
  return '';
}

/** Contraseña actual del cambio autenticado (F-06): no vacía y de hasta 64 caracteres. */
export function currentPasswordError(value: string): string {
  if (value.trim() === '' || value.length > PASSWORD_MAX_LENGTH) {
    return MESSAGES.currentPassword;
  }
  return '';
}

/** Código de recuperación (F-05): 6 dígitos. El mensaje es genérico a propósito. */
export function codeError(value: string): string {
  if (!CODE_PATTERN.test(value)) {
    return MESSAGES.code;
  }
  return '';
}
