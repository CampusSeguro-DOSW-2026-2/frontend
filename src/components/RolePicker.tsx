import { ROLE_OPTIONS } from '../utils/labels';

interface Props {
  id: string;
  label: string;
  help: string;
  value: string[];
  onChange: (roles: string[]) => void;
  error?: string;
  disabled?: boolean;
}

/** Selección múltiple de roles del catálogo (F-09: ambas listas son opcionales). */
export function RolePicker({ id, label, help, value, onChange, error, disabled = false }: Props) {
  const toggle = (role: string) => onChange(value.includes(role) ? value.filter((r) => r !== role) : [...value, role]);
  const msgId = `${id}-msg`;

  return (
    <div className="field" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="lbl">{label}</span>
      <div className={`multi${error ? ' bad' : ''}`}>
        <span className="help">{help}</span>
        <div className="pills">
          {ROLE_OPTIONS.map((o) => (
            <button
              type="button"
              key={o.value}
              className="pill"
              aria-pressed={value.includes(o.value)}
              aria-describedby={error ? msgId : undefined}
              disabled={disabled}
              onClick={() => toggle(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {error && <span id={msgId} className="error" role="alert">{error}</span>}
    </div>
  );
}
