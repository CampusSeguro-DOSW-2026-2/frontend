import { useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, EyeOff } from './Icons';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  optional?: boolean;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'search' | 'url';
  icon?: ReactNode;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  disabled?: boolean;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal' | 'search' | 'url';
  /** Texto largo: varias líneas que crecen con el contenido (solo para type="text"). */
  multiline?: boolean;
}

/**
 * Campo de formulario único de la aplicación: etiqueta, ayuda y error accesibles (aria-invalid y aria-describedby), marca
 * de opcional y ojo para contraseñas con área táctil de 44 px. Los formularios enfocan el primer campo con error al enviar.
 */
export function Campo({
  id, label, value, onChange, error, optional = false, type = 'text', icon, hint, placeholder, autoComplete, maxLength,
  disabled = false, inputMode, multiline = false,
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
      <div className={`input${multiline ? ' area' : ''}${error ? ' bad' : ''}`}>
        {icon}
        {multiline ? (
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            rows={3}
            aria-required={!optional}
            aria-invalid={!!error}
            aria-describedby={error || hint ? msgId : undefined}
          />
        ) : <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          disabled={disabled}
          inputMode={inputMode}
          aria-required={!optional}
          aria-invalid={!!error}
          aria-describedby={error || hint ? msgId : undefined}
        />}
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
