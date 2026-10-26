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
