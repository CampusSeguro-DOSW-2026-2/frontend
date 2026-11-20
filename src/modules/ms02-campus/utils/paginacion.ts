/** Página de una lista que ya está en memoria. La página pedida se ajusta si la lista se acortó. */
export function paginar<T>(lista: T[], pagina: number, tamano: number) {
  const paginas = Math.max(1, Math.ceil(lista.length / tamano));
  const actual = Math.min(Math.max(pagina, 0), paginas - 1);
  return { items: lista.slice(actual * tamano, (actual + 1) * tamano), actual, paginas };
}
