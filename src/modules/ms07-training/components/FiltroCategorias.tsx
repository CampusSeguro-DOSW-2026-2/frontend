import type { Categoria } from '../types';
import '../styles/aprendizaje.css';

/** Grupos del filtro, en el orden en que se piensa una emergencia: primero el momento y después el lugar. */
const GRUPOS: { titulo: string; claves: string[] }[] = [
  { titulo: 'Momento', claves: ['antes', 'durante', 'despues'] },
  { titulo: 'Lugar', claves: ['auditorio', 'laboratorio', 'oficina', 'salon', 'evacuacion'] },
];

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Posición de la categoría dentro de su grupo (según la primera clave que aparece en su nombre) o -1. */
const posicion = (nombre: string, claves: string[]) => {
  const n = normalizar(nombre);
  return claves.findIndex((clave) => n.includes(clave));
};

/**
 * Filtro por categoría agrupado en «Momento» (Antes, Durante, Después) y «Lugar» (Auditorios, Laboratorios, Oficinas,
 * Salones, Evacuación), en ese orden y no alfabético. Las categorías que no encajan van al final en «Otras».
 * Solo agrupa lo que muestra: las categorías y su filtro siguen siendo las de MS07.
 */
export function FiltroCategorias({ categorias, elegida, onElegir }: {
  categorias: Categoria[]; elegida: string; onElegir: (id: string) => void;
}) {
  const usadas = new Set<string>();
  const grupos = GRUPOS.map(({ titulo, claves }) => {
    const items = categorias
      .filter((c) => !usadas.has(c.id) && posicion(c.name, claves) >= 0)
      .sort((a, b) => posicion(a.name, claves) - posicion(b.name, claves));
    items.forEach((c) => usadas.add(c.id));
    return { titulo, items };
  });
  const otras = categorias.filter((c) => !usadas.has(c.id));
  if (otras.length > 0) grupos.push({ titulo: 'Otras', items: otras });

  const pill = (id: string, nombre: string) => (
    <button key={id || 'todas'} type="button" className="pill" aria-pressed={elegida === id} onClick={() => onElegir(id)}>
      {nombre}
    </button>
  );

  return (
    <div className="ap-filtro" role="group" aria-label="Filtrar por categoría">
      <div className="pills">{pill('', 'Todas')}</div>
      {grupos.filter((g) => g.items.length > 0).map((g) => (
        <div key={g.titulo} className="ap-filtro-grupo" role="group" aria-label={g.titulo}>
          <span className="ap-filtro-titulo" aria-hidden="true">{g.titulo}</span>
          <div className="pills">{g.items.map((c) => pill(c.id, c.name))}</div>
        </div>
      ))}
    </div>
  );
}
