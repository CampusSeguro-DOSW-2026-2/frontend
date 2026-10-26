export interface NameParts {
  firstName: string;
  secondName: string;
  firstLastName: string;
  secondLastName: string;
}

// Partículas que forman parte del nombre o apellido que sigue ("de la Cruz", "del Río")
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los']);

/**
 * Separa "Nombres y apellidos" en las 4 partes que pide el back.
 * Regla (convención hispana de dos apellidos):
 *   2 palabras  -> nombre + apellido
 *   3 palabras  -> nombre + dos apellidos
 *   4 o más     -> los dos últimos son apellidos; el primero es el nombre y el resto, segundo nombre
 * Devuelve null si hay menos de un nombre y un apellido.
 */
export function splitFullName(full: string): NameParts | null {
  const words = full.trim().split(/\s+/).filter(Boolean);

  // Une cada partícula con la palabra que le sigue
  const tokens: string[] = [];
  let pending: string[] = [];
  for (const w of words) {
    if (PARTICLES.has(w.toLowerCase())) {
      pending.push(w);
      continue;
    }
    tokens.push([...pending, w].join(' '));
    pending = [];
  }
  if (pending.length) {
    if (tokens.length) tokens[tokens.length - 1] += ' ' + pending.join(' ');
    else tokens.push(pending.join(' '));
  }

  const n = tokens.length;
  if (n < 2) return null;
  if (n === 2) return { firstName: tokens[0], secondName: '', firstLastName: tokens[1], secondLastName: '' };
  if (n === 3) return { firstName: tokens[0], secondName: '', firstLastName: tokens[1], secondLastName: tokens[2] };
  return {
    firstName: tokens[0],
    secondName: tokens.slice(1, n - 2).join(' '),
    firstLastName: tokens[n - 2],
    secondLastName: tokens[n - 1],
  };
}
