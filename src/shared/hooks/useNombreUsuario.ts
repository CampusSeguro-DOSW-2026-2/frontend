import { useEffect, useState } from 'react';
import { request } from '../services/http';
import { sessionPermissions } from '../services/session';
import type { Session } from '../types';

/** Evento que avisa que el usuario cambió su nombre (Editar perfil): la barra lo vuelve a consultar. */
export const PERFIL_ACTUALIZADO = 'campusseguro:perfil-actualizado';

const clave = (userId: string) => `cs.nombre.${userId}`;

/** «jUAN  pérez» → «Juan Pérez»: primera letra de cada palabra en mayúscula y el resto en minúscula. */
export function nombrePropio(texto: string): string {
  return texto.trim().toLocaleLowerCase('es').split(/\s+/)
    .map((p) => p.charAt(0).toLocaleUpperCase('es') + p.slice(1)).join(' ');
}

const leer = (userId: string): string | null => {
  try { return sessionStorage.getItem(clave(userId)); } catch { return null; }
};
const guardar = (userId: string, nombre: string | null) => {
  try {
    if (nombre) sessionStorage.setItem(clave(userId), nombre);
    else sessionStorage.removeItem(clave(userId));
  } catch { /* sin almacenamiento: se consulta de nuevo la próxima vez */ }
};

/** Tras guardar el perfil: descarta el nombre guardado y avisa a la barra para que muestre el nuevo. */
export function avisarPerfilActualizado(userId: string): void {
  guardar(userId, null);
  window.dispatchEvent(new Event(PERFIL_ACTUALIZADO));
}

/**
 * Nombre visible del usuario («Primer nombre Primer apellido») para la barra superior. El token no trae el nombre: se
 * pide a MS01 (GET /users/me) una vez por sesión y se guarda en la pestaña. Mientras carga, sin permiso o si MS01 no
 * responde, devuelve null y la barra muestra el correo.
 */
export function useNombreUsuario(session: Session | null): string | null {
  const userId = session?.user.id ?? '';
  const puede = sessionPermissions(session).includes('ms01:profile:read');
  const [nombre, setNombre] = useState<{ id: string; valor: string | null }>({ id: '', valor: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const recargar = () => setVersion((v) => v + 1);
    window.addEventListener(PERFIL_ACTUALIZADO, recargar);
    return () => window.removeEventListener(PERFIL_ACTUALIZADO, recargar);
  }, []);

  useEffect(() => {
    if (!session || !userId || !puede || leer(userId)) return undefined;
    let vigente = true;
    request('/api/v1/users/me', { session })
      .then((data) => {
        const d = (data ?? {}) as Record<string, unknown>;
        const partes = [d.primer_nombre, d.primer_apellido].filter((p): p is string => typeof p === 'string' && p.trim() !== '');
        const valor = partes.length ? nombrePropio(partes.join(' ')) : null;
        guardar(userId, valor);
        if (vigente) setNombre({ id: userId, valor });
      })
      .catch(() => { /* se queda el correo */ });
    return () => { vigente = false; };
  }, [session, userId, puede, version]);

  if (!userId) return null;
  return leer(userId) ?? (nombre.id === userId ? nombre.valor : null);
}
