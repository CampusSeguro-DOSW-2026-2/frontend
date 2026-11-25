import { request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';

/**
 * Personas de MS01 para la auditoría: MS08 guarda solo el id del usuario. Exige ms01:user:read (administrador y
 * auditor); sin ese permiso la pantalla no busca ni muestra nombres.
 */
export interface Person { id: string; name: string; email: string }

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function toPerson(d: Raw): Person {
  const name = [str(d.primer_nombre), str(d.primer_apellido)].filter(Boolean).join(' ');
  return { id: String(d.id), name: name || str(d.correo), email: str(d.correo) };
}

const cache = new Map<string, Promise<Person | null>>();

/** Minúsculas y sin tildes: «Andrés» y «andres» coinciden. */
export const normalizar = (t: string) => t.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().trim();

let todas: Promise<Person[]> | null = null;

export const peopleApi = {
  /**
   * Todas las personas (GET /api/v1/users, de a 100), una sola vez por sesión de la pantalla: MS01 solo busca dentro
   * del correo, así que la búsqueda por nombre se hace aquí. Un fallo no se memoriza.
   */
  todas(session: Session): Promise<Person[]> {
    if (!todas) {
      todas = (async () => {
        const lista: Person[] = [];
        for (let page = 0; page < 50; page++) {
          const data = (await request(`/api/v1/users?page=${page}&size=100`, { session })) as Raw | null;
          const rows = Array.isArray(data?.contenido) ? (data.contenido as Raw[]) : [];
          lista.push(...rows.map(toPerson));
          if (page + 1 >= Number(data?.total_paginas ?? 0)) break;
        }
        lista.forEach((p) => cache.set(p.id, Promise.resolve(p)));
        return lista;
      })().catch((err: unknown) => { todas = null; throw err; });
    }
    return todas;
  },

  /** Personas cuyo nombre o correo contiene el texto (sin distinguir tildes ni mayúsculas). */
  async coinciden(session: Session, texto: string): Promise<Person[]> {
    const q = normalizar(texto);
    return (await this.todas(session)).filter((p) => normalizar(`${p.name} ${p.email}`).includes(q));
  },

  /** GET /api/v1/users/{id}, con caché para no repetirla en cada página; un fallo da null. */
  get(session: Session, id: string): Promise<Person | null> {
    let found = cache.get(id);
    if (!found) {
      found = request(`/api/v1/users/${encodeURIComponent(id)}`, { session })
        .then((d) => toPerson((d ?? {}) as Raw))
        .catch(() => { cache.delete(id); return null; });
      cache.set(id, found);
    }
    return found;
  },
};
