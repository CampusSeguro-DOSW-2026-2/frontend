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

/**
 * Barra de filtros del listado de alertas: un grupo de botones por cada grupo que entregue MS03, con el mismo
 * aspecto que las pestañas de eventos. No conoce los estados ni los tipos: solo dibuja `groups` y reporta los
 * cambios con `onToggle`/`onClear`, de modo que el backend puede agregar opciones sin tocar este componente.
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
          </div>
        );
      })}
    </div>
  );
}
