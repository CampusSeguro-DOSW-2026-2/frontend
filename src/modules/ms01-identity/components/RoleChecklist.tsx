import { useEffect, useRef } from 'react';
import type { RoleOption } from '../hooks/useRoleOptions';
import type { RolesDraft, UserSummary } from '../types';
import '../styles/users.css';

interface Props {
  /** Roles que se pueden elegir (useRoleOptions). */
  options: RoleOption[];
  /** Usuarios a los que se aplica el cambio, con sus roles actuales. */
  users: UserSummary[];
  /** Cambio pedido: roles que se dan a todos y roles que se quitan a todos (F-09). */
  value: RolesDraft;
  onChange: (draft: RolesDraft) => void;
  error?: string;
  disabled?: boolean;
}

/** Casilla de tres estados: el estado mixto (algunos usuarios tienen el rol) no existe como atributo de HTML. */
function TriState({ checked, mixed, disabled, onToggle, label }: {
  checked: boolean; mixed: boolean; disabled: boolean; onToggle: () => void; label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <input ref={ref} type="checkbox" checked={checked} disabled={disabled} onChange={onToggle}
      aria-checked={mixed ? 'mixed' : checked} aria-label={label} />
  );
}

/**
 * Una sola lista de roles para los usuarios seleccionados (F-09), como las etiquetas de un correo: cada rol muestra
 * cuántos lo tienen y una casilla de tres estados. Un clic se lo da a todos, otro se lo quita a todos y, si al principio
 * solo algunos lo tenían, un tercero lo deja como estaba. El resultado se traduce a las listas agregar y retirar.
 */
export function RoleChecklist({ options, users, value, onChange, error, disabled = false }: Props) {
  const total = users.length;

  const next = (role: string): RolesDraft => {
    const holders = users.filter((u) => u.roles.includes(role)).length;
    const add = value.add.filter((r) => r !== role);
    const remove = value.remove.filter((r) => r !== role);
    if (value.add.includes(role)) {
      // Dado a todos → quitado a todos; si nadie lo tenía, quitarlo es lo mismo que dejarlo como estaba
      return holders === 0 ? { add, remove } : { add, remove: [...remove, role] };
    }
    if (value.remove.includes(role)) {
      // Quitado a todos → como estaba (todos o algunos lo tenían)
      return { add, remove };
    }
    // Sin cambio → si todos lo tienen se quita; si no, se da a todos
    return holders === total ? { add, remove: [...remove, role] } : { add: [...add, role], remove };
  };

  return (
    <div className="field" role="group" aria-labelledby="roles-label" id="roles" tabIndex={-1}>
      <span id="roles-label" className="lbl">Roles</span>
      <span className="help">
        Marque un rol para dárselo a todos los usuarios seleccionados y desmárquelo para quitárselo.
      </span>
      <ul className={`role-checklist${error ? ' bad' : ''}`}>
        {options.map((o) => {
          const holders = users.filter((u) => u.roles.includes(o.value)).length;
          const adding = value.add.includes(o.value);
          const removing = value.remove.includes(o.value);
          const checked = adding || (!removing && holders === total && total > 0);
          const mixed = !adding && !removing && holders > 0 && holders < total;
          let change = '';
          if (adding && holders < total) change = `Se agregará a ${total - holders}`;
          if (removing && holders > 0) change = `Se quitará a ${holders}`;
          return (
            <li key={o.value} className={change ? 'changed' : undefined}>
              <label>
                <TriState checked={checked} mixed={mixed} disabled={disabled || total === 0}
                  onToggle={() => onChange(next(o.value))} label={o.label} />
                <span className="name">{o.label}</span>
              </label>
              <span className="holders">Lo tienen {holders} de {total}</span>
              {change && <span className={`change ${adding ? 'plus' : 'minus'}`}>{change}</span>}
            </li>
          );
        })}
      </ul>
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}
