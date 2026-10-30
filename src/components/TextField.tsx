import { useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, EyeOff } from './Icons';
import '../auth.css';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  optional?: boolean;
  type?: 'text' | 'email' | 'password';
  icon?: ReactNode;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
}

/** Campo de texto con la identidad visual: etiqueta, error y ayuda accesibles, y ojo para contraseñas. */
export function TextField({
  id, label, value, onChange, error, optional = false, type = 'text', icon, hint, placeholder, autoComplete, maxLength,
}: Props) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const msgId = `${id}-msg`;

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {optional && <span className="hint"> (opcional)</span>}
      </label>
      <div className={`input${error ? ' bad' : ''}`}>
        {icon}
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-required={!optional}
          aria-invalid={!!error}
          aria-describedby={error || hint ? msgId : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className="toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff /> : <Eye />}
          </button>
        )}
      </div>
      {error
        ? <span id={msgId} className="error" role="alert">{error}</span>
        : hint && <span id={msgId} className="hint">{hint}</span>}
    </div>
  );
}
