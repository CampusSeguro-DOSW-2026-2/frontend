import type { LoginDraft, RegisterDraft, Session } from '../types';

/**
 * Cliente de MS01 (identidad). Solo lo que el backend ya expone hoy: registro e inicio de sesión.
 * No usa localStorage de respaldo: registrar una cuenta o iniciar sesión de mentira no tendría sentido.
 */
const MS01_URL = (import.meta.env.VITE_MS01_URL as string | undefined) ?? 'http://localhost:8080';

export type FieldErrors = Partial<Record<keyof RegisterDraft, string>>;

/** Error de la API con el detalle por campo (ya traducido a los nombres del formulario). */
export class ApiError extends Error {
  status: number;
  fields: FieldErrors;

  constructor(status: number, message: string, fields: FieldErrors = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

// El back responde los errores 400 con { <campo del DTO>: <mensaje> }
const FIELD_MAP: Record<string, keyof RegisterDraft> = {
  primer_nombre: 'firstName',
  segundo_nombre: 'secondName',
  primer_apellido: 'firstLastName',
  segundo_apellido: 'secondLastName',
  correo: 'email',
  password: 'password',
  password_hash: 'password', // nombre actual del campo en UserCreateRequest
};

export async function registerUser(d: RegisterDraft): Promise<void> {
  const body: Record<string, string> = {
    primer_nombre: d.firstName.trim(),
    primer_apellido: d.firstLastName.trim(),
    correo: d.email.trim().toLowerCase(),
    password: d.password,
  };
  // Los segundos nombres son opcionales: si están vacíos no se envían
  if (d.secondName.trim()) body.segundo_nombre = d.secondName.trim();
  if (d.secondLastName.trim()) body.segundo_apellido = d.secondLastName.trim();

  let res: Response;
  try {
    res = await fetch(`${MS01_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Intenta de nuevo en unos minutos.');
  }

  if (res.ok) return;

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.status === 400) {
    const fields: FieldErrors = {};
    for (const [key, msg] of Object.entries(data)) {
      const field = FIELD_MAP[key];
      if (field && typeof msg === 'string') fields[field] = msg;
    }
    throw new ApiError(400, 'Revisa los datos ingresados.', fields);
  }
  if (res.status === 409) {
    throw new ApiError(409, 'Ya existe una cuenta con este correo.', {
      email: 'Ya existe una cuenta registrada con este correo.',
    });
  }
  throw new ApiError(res.status, 'Ocurrió un error inesperado. Intenta de nuevo más tarde.');
}

const NETWORK_ERROR = 'No se pudo conectar con el servidor. Intenta de nuevo en unos minutos.';
const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';

// El login responde los errores 400 como { errores: [{ campo, mensaje }] }
const LOGIN_FIELD_MAP: Record<string, keyof LoginDraft> = {
  correo: 'email',
  contrasena: 'password',
};

/** Mensaje que envía el back (campo "mensaje"); si no llega, se usa el texto del requerimiento. */
function serverMessage(data: Record<string, unknown>, fallback: string): string {
  const message = data.mensaje;
  if (typeof message === 'string' && message.trim() !== '') {
    return message;
  }
  return fallback;
}

function loginFieldErrors(data: Record<string, unknown>): FieldErrors {
  const fields: FieldErrors = {};
  if (!Array.isArray(data.errores)) {
    return fields;
  }

  for (const item of data.errores) {
    const detail = item as Record<string, unknown>;
    const field = LOGIN_FIELD_MAP[String(detail.campo)];
    if (field && typeof detail.mensaje === 'string') {
      fields[field] = detail.mensaje;
    }
  }
  return fields;
}

function toSession(data: Record<string, unknown>): Session {
  const user = data.usuario as Record<string, unknown> | undefined;
  const validToken = typeof data.token === 'string' && data.token !== '';
  const validExpiration = typeof data.expira_en === 'string' && data.expira_en !== '';
  if (!validToken || !validExpiration || !user) {
    throw new ApiError(500, UNEXPECTED_ERROR);
  }

  let roles: string[] = [];
  if (Array.isArray(user.roles)) {
    roles = user.roles.map(String);
  }

  return {
    token: data.token as string,
    tokenType: String(data.tipo ?? 'Bearer'),
    expiresAt: data.expira_en as string,
    user: {
      id: String(user.id),
      email: String(user.correo),
      roles,
    },
  };
}

/**
 * Inicia sesión (RF-MS01-02). Aplica RG-01 (correo recortado y en minúsculas, contraseña intacta)
 * y RG-04 (solo envía los campos del contrato). El token y su vencimiento los guarda quien llama.
 */
export async function loginUser(d: LoginDraft): Promise<Session> {
  const body = {
    correo: d.email.trim().toLowerCase(),
    contrasena: d.password,
  };

  let res: Response;
  try {
    res = await fetch(`${MS01_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.ok) {
    return toSession(data);
  }

  if (res.status === 400) {
    throw new ApiError(400, 'Revisa los datos ingresados.', loginFieldErrors(data));
  }
  // 401 y 403 se muestran como mensaje global del formulario (RN-MS01-05: sin decir qué dato falló)
  if (res.status === 401) {
    throw new ApiError(401, serverMessage(data, 'Credenciales incorrectas.'));
  }
  if (res.status === 403) {
    throw new ApiError(403, serverMessage(data, 'Cuenta inactiva. Contacte al administrador.'));
  }
  throw new ApiError(res.status, UNEXPECTED_ERROR);
}
