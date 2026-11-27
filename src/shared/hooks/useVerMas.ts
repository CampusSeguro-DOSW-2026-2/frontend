import { useState } from 'react';

/** Elementos que se muestran antes de «Ver los N restantes». */
export const VISIBLES_INICIALES = 3;

/**
 * Listas que pueden crecer mucho (eventos en curso): muestra los primeros `inicial` y deja desplegar el resto en el
 * mismo lugar, para no saturar la pantalla. `restantes` es 0 cuando ya se ve todo.
 */
export function useVerMas<T>(lista: T[], inicial = VISIBLES_INICIALES) {
  const [todos, setTodos] = useState(false);
  const visibles = todos ? lista : lista.slice(0, inicial);
  return { visibles, restantes: lista.length - visibles.length, verTodos: () => setTodos(true) };
}
