import type { RegisterDraft } from '../types';

/**
 * Cliente de MS01 (identidad). Solo lo que el backend ya expone hoy: registro.
 * No usa localStorage de respaldo: registrar una cuenta falsa no tendría sentido.
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
