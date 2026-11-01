import { useEffect, useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import '../auth.css';

/** Cantidad de dígitos del código de recuperación (F-05). */
export const CODE_LENGTH = 6;

interface Props {
  id: string;
  label: string;
  /** Dígitos escritos hasta ahora (0 a 6, sin huecos). */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Código de verificación de 6 dígitos, una casilla por dígito. Los dígitos se escriben siempre en orden:
 * el foco va solo a la siguiente casilla, borrar quita el último dígito y se puede pegar el código completo
 * (o usar el autocompletado del teléfono).
 */
export function CodeInput({ id, label, value, onChange, error, disabled = false }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const labelId = `${id}-label`;
  const msgId = `${id}-msg`;
  const active = Math.min(value.length, CODE_LENGTH - 1);

  // El foco acompaña al código mientras se escribe, pero no se roba al cargar la pantalla vacía
  useEffect(() => {
    if (value.length > 0 && !disabled) {
      refs.current[active]?.focus();
    }
  }, [value, active, disabled]);

  const setFromText = (raw: string) => {
    onChange(raw.replace(/\D/g, '').slice(0, CODE_LENGTH));
  };

  const onInput = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits === '') {
      return;
    }
    // Autocompletado o pegado en una sola casilla: trae el código completo
    if (digits.length >= CODE_LENGTH) {
      setFromText(digits);
      return;
    }
    const typed = digits.slice(-1);
    onChange((value.slice(0, Math.min(index, value.length)) + typed).slice(0, CODE_LENGTH));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setFromText(e.clipboardData.getData('text'));
  };

  return (
    <div className="field code-field" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="lbl">{label}</span>
      <div className="code-boxes">
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <input
            key={index}
            ref={(el) => { refs.current[index] = el; }}
            id={index === 0 ? id : `${id}-${index + 1}`}
            className={`code-box${error ? ' bad' : ''}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            value={value[index] ?? ''}
            disabled={disabled}
            aria-label={`Dígito ${index + 1} de ${CODE_LENGTH}`}
            aria-invalid={!!error}
            aria-describedby={error ? msgId : undefined}
            onFocus={() => {
              // Solo se puede escribir en la casilla que sigue: los dígitos no dejan huecos
              if (index !== active) {
                refs.current[active]?.focus();
              }
            }}
            onChange={(e) => onInput(index, e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />
        ))}
      </div>
      {error && <span id={msgId} className="error" role="alert">{error}</span>}
    </div>
  );
}
