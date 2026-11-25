import { useEffect, useId, useRef, useState } from 'react';
import type { AlertFilterGroup } from '../services/alertFilters';

interface AlertFilterBarProps {
  groups: AlertFilterGroup[];
  selected: Record<string, string[]>;
  onToggle: (group: string, value: string) => void;
  onClear: (group: string) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

/** Texto del botón del desplegable: «Todos», el único elegido, dos elegidos o cuántos. */
function summary(group: AlertFilterGroup, values: string[]): string {
  if (values.length === 0) return 'Todos';
  const labels = group.options.filter((o) => values.includes(o.value)).map((o) => o.label);
  if (labels.length <= 2) return labels.join(', ');
  return `${labels.length} seleccionados`;
}

/**
 * Grupo de selección múltiple (por ejemplo, Tipo) como desplegable con casillas: con muchas opciones, una fila de
 * botones se ve desordenada. Se cierra al hacer clic fuera o con Escape.
 */
function MultiSelect({ group, values, onToggle, onClear }: {
  group: AlertFilterGroup; values: string[]; onToggle: (value: string) => void; onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  return (
    <div className="filter-dd" ref={box}>
      <button ref={button} type="button" className={`filter-dd-btn${values.length ? ' on' : ''}`} aria-haspopup="true" aria-expanded={open}
        aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <span>{summary(group, values)}</span>
        <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="filter-dd-menu" id={id} role="group" aria-label={group.label}>
          {group.options.map((option) => (
            <label key={option.value} className="filter-dd-opt">
              <input type="checkbox" checked={values.includes(option.value)} onChange={() => onToggle(option.value)} />
              {option.label}
            </label>
          ))}
          <div className="filter-dd-foot">
            <button type="button" className="plink" disabled={values.length === 0} onClick={onClear}>Quitar selección</button>
            <button type="button" className="plink" onClick={() => setOpen(false)}>Listo</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Barra de filtros del listado de alertas, con los grupos que entrega MS03. Un grupo de selección única (Estado) se
 * muestra como pestañas, igual que en Eventos; uno de selección múltiple (Tipo), como desplegable con casillas. No
 * conoce los estados ni los tipos: solo dibuja `groups` y reporta los cambios con `onToggle`/`onClear`, de modo que el
 * backend puede agregar opciones sin tocar este componente.
 */
export default function AlertFilterBar({
  groups,
  selected,
  onToggle,
  onClear,
  loading = false,
  error = '',
  onRetry,
}: AlertFilterBarProps) {
  if (loading) {
    return <p className="notice" role="status">Cargando filtros…</p>;
  }
  if (error) {
    return (
      <p className="notice err" role="alert">
        {error} {onRetry && <button type="button" className="plink" onClick={onRetry}>Reintentar</button>}
      </p>
    );
  }
  if (!groups.length) {
    return null;
  }

  return (
    <div className="filterbar">
      {groups.map((group) => {
        const values = selected[group.key] ?? [];
        return (
          <div key={group.key} className="filter-group">
            <span className="filter-group-label">{group.label}</span>
            {group.multiple ? (
              <MultiSelect group={group} values={values} onToggle={(v) => onToggle(group.key, v)} onClear={() => onClear(group.key)} />
            ) : (
              <div className="filter-tabs" role="group" aria-label={group.label}>
                <button type="button" className="filter-tab" aria-pressed={values.length === 0}
                  onClick={() => onClear(group.key)}>
                  Todos
                </button>
                {group.options.map((option) => (
                  <button key={option.value} type="button" className="filter-tab"
                    aria-pressed={values.includes(option.value)} onClick={() => onToggle(group.key, option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
