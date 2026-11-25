import { useEffect, useId, useRef, useState } from 'react';

export interface Opcion { id: string; label: string; detail?: string }

interface Props {
  label: string;
  placeholder: string;
  texto: string;
  onTexto: (texto: string) => void;
  /** Coincidencias del texto (null mientras no hay texto). */
  opciones: Opcion[] | null;
  /** La opción elegida en la lista; null si se filtra por todas las coincidencias. */
  elegida: Opcion | null;
  onElegir: (opcion: Opcion | null) => void;
  /** Texto bajo el campo (cuántas coinciden o por quién se filtra). */
  ayuda: string;
}

/**
 * Filtro por nombre: al escribir (basta una parte) filtra por todas las coincidencias y despliega la lista con su
 * detalle (por ejemplo, el correo) para elegir una sola. Se cierra al elegir, al hacer clic fuera o con Escape.
 */
export default function FiltroBusqueda({ label, placeholder, texto, onTexto, opciones, elegida, onElegir, ayuda }: Props) {
  const id = useId();
  const caja = useRef<HTMLDivElement>(null);
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!abierta) return undefined;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierta(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierta(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', escape); };
  }, [abierta]);

  const visibles = (opciones ?? []).slice(0, 8);
  const mostrar = abierta && !elegida && texto.trim() !== '' && opciones !== null;

  return (
    <div className="field an-search" ref={caja}>
      <label htmlFor={id}>{label}</label>
      <div className="an-input">
        <input id={id} type="search" value={texto} placeholder={placeholder} autoComplete="off" role="combobox"
          aria-expanded={mostrar} aria-controls={`${id}-lista`} aria-describedby={`${id}-ayuda`}
          onChange={(e) => { onTexto(e.target.value); onElegir(null); setAbierta(true); }}
          onFocus={() => setAbierta(true)} />
        {mostrar && (
          <div className="an-options" id={`${id}-lista`} role="listbox" aria-label={label}>
            {visibles.length === 0 && <span className="help">Sin coincidencias.</span>}
            {visibles.map((o) => (
              <button key={o.id} type="button" role="option" aria-selected={false}
                onClick={() => { onElegir(o); onTexto(o.label); setAbierta(false); }}>
                <b>{o.label}</b>{o.detail && <small>{o.detail}</small>}
              </button>
            ))}
            {(opciones?.length ?? 0) > visibles.length && (
              <span className="help">y {(opciones?.length ?? 0) - visibles.length} más: siga escribiendo para acotar.</span>
            )}
          </div>
        )}
      </div>
      <span id={`${id}-ayuda`} className="help" aria-live="polite">{ayuda}</span>
    </div>
  );
}
