export function Paginacion({ actual, paginas, total, nombre, onCambiar }: {
  actual: number; paginas: number; total: number; nombre: string; onCambiar: (pagina: number) => void;
}) {
  if (paginas <= 1) return null;
  return (
    <nav className="cs-paginacion" aria-label={`Páginas de ${nombre}`}>
      <span>Página {actual + 1} de {paginas} · {total} {nombre}</span>
      <div>
        <button type="button" className="cs-mini" disabled={actual === 0} onClick={() => onCambiar(actual - 1)}>Anterior</button>
        <button type="button" className="cs-mini" disabled={actual + 1 >= paginas} onClick={() => onCambiar(actual + 1)}>Siguiente</button>
      </div>
    </nav>
  );
}
