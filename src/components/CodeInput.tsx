import { useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';

interface Props {
  id: string;
  label: string;
  value: string; // hasta 6 dígitos
  onChange: (v: string) => void;
  error?: string;
  length?: number;
}

/** Código de verificación en casillas separadas: avanza solo, admite borrar y pegar el código completo. */
export function CodeInput({ id, label, value, onChange, error, length = 6 }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const msgId = `${id}-msg`;
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focusAt = (i: number) => refs.current[Math.min(Math.max(i, 0), length - 1)]?.focus();

  const setDigit = (i: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    if (clean === '') {
      onChange(digits.map((d, j) => (j === i ? '' : d)).join('').slice(0, length));
      return;
    }
    // Varios dígitos (autocompletado o pegado dentro de una casilla): se reparten desde esta casilla
    const next = [...digits];
    for (let k = 0; k < clean.length && i + k < length; k++) {
      next[i + k] = clean[k];
    }
    onChange(next.join(''));
    focusAt(i + clean.length);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && digits[i] === '') {
      e.preventDefault();
      onChange(digits.map((d, j) => (j === i - 1 ? '' : d)).join(''));
      focusAt(i - 1);
    } else if (e.key === 'ArrowLeft') {
      focusAt(i - 1);
    } else if (e.key === 'ArrowRight') {
      focusAt(i + 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
      focusAt(pasted.length);
    }
  };

  return (
    <div className="field">
      <label htmlFor={`${id}-0`}>{label}</label>
      <div className="otp" role="group" aria-label={label}>
        {digits.map((d, i) => (
          <input
            key={i}
            id={`${id}-${i}`}
            ref={(el) => { refs.current[i] = el; }}
            className={error ? 'bad' : ''}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            value={d}
            aria-label={`Dígito ${i + 1} de ${length}`}
            aria-invalid={!!error}
            aria-describedby={error ? msgId : undefined}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
      {error && <span id={msgId} className="error" role="alert">{error}</span>}
    </div>
  );
}
