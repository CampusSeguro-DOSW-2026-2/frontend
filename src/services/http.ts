export const MS03_URL = (import.meta.env.VITE_MS03_URL as string | undefined) ?? 'http://localhost:8080';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}

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
    let code = 'ERROR', message = `Error ${r.status}`;
    try { const j = await r.json(); code = j.code ?? code; message = j.message ?? message; } catch { /* sin cuerpo */ }
    throw new ApiError(r.status, code, message);
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}
