import type { Session } from '../types';

/**
 * Sesión del usuario autenticado (F-02: guardar token y expiración).
 *
 * Con "Recuérdame" la sesión queda en localStorage y sobrevive al cierre del navegador;
 * sin "Recuérdame" queda en sessionStorage y se pierde al cerrar la pestaña.
 * Si el navegador no permite usar el almacenamiento, la sesión vive solo en memoria.
 */
const STORAGE_KEY = 'campusseguro.session';

let memorySession: Session | null = null;

type StorageName = 'localStorage' | 'sessionStorage';

// Acceder a window.localStorage puede lanzar error (navegación privada, datos de sitio bloqueados)
function readFrom(name: StorageName): Session | null {
  try {
    const raw = window[name].getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function isExpired(session: Session): boolean {
  const expiresAt = Date.parse(session.expiresAt);
  if (Number.isNaN(expiresAt)) {
    return true;
  }
  return expiresAt <= Date.now();
}

/** Guarda la sesión reemplazando cualquiera anterior. */
export function saveSession(session: Session, remember: boolean): void {
  clearSession();
  memorySession = session;

  let name: StorageName = 'sessionStorage';
  if (remember) {
    name = 'localStorage';
  }

  try {
    window[name].setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Sin almacenamiento disponible: la sesión queda solo en memoria
  }
}

/** Devuelve la sesión vigente, o null si no hay o ya venció (en ese caso la elimina). */
export function getSession(): Session | null {
  let session = memorySession;
  if (!session) {
    session = readFrom('localStorage');
  }
  if (!session) {
    session = readFrom('sessionStorage');
  }
  if (!session) {
    return null;
  }

  if (isExpired(session)) {
    clearSession();
    return null;
  }
  return session;
}

export function clearSession(): void {
  memorySession = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento disponible: no hay nada que borrar
  }
}

// Permisos de cada token ya leídos, para no decodificar el mismo token en cada render
const permissionsByToken = new Map<string, string[]>();

/**
 * Permisos efectivos de la sesión: el claim `permissions` del JWT que emite MS01 (códigos `msNN:recurso:accion`).
 * La interfaz decide qué mostrar con estos permisos y nunca con el nombre de un rol, porque los roles los define el
 * administrador. Es solo para la interfaz: quien autoriza de verdad es el back. Si el token no se puede leer, no hay
 * permisos.
 */
export function sessionPermissions(session: Session | null): string[] {
  if (!session) {
    return [];
  }
  const cached = permissionsByToken.get(session.token);
  if (cached) {
    return cached;
  }

  let permissions: string[] = [];
  try {
    const payload = session.token.split('.')[1] ?? '';
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const value = typeof claims === 'object' && claims !== null ? (claims as Record<string, unknown>).permissions : null;
    if (Array.isArray(value)) {
      permissions = value.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // Token ilegible: sin permisos en la interfaz
  }
  permissionsByToken.set(session.token, permissions);
  return permissions;
}

/** Indica si la sesión tiene alguno de los permisos indicados. */
export function hasPermission(session: Session | null, ...codes: string[]): boolean {
  const permissions = sessionPermissions(session);
  return codes.some((code) => permissions.includes(code));
}

// Aviso para la pantalla de inicio de sesión: "Sesión cerrada.", "Tu sesión venció...", etc.
// Vive solo en memoria: se muestra una vez, en la siguiente pantalla de inicio de sesión.
let pendingNotice = '';

/** Deja un aviso para mostrarlo en el siguiente inicio de sesión. */
export function setSessionNotice(message: string): void {
  pendingNotice = message;
}

/** Entrega el aviso pendiente (si hay) y lo descarta. */
export function takeSessionNotice(): string {
  const message = pendingNotice;
  pendingNotice = '';
  return message;
}
