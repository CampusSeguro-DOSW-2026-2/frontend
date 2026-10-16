import type { Option } from '../types';

interface Props { label: string; help: string; options: Option[]; value: string[]; onChange: (v: string[]) => void; error?: string }

export function MultiSelect({ label, help, options, value, onChange, error }: Props) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="field" role="group" aria-label={label}>
      <span className="lbl">{label} <span style={{ color: 'var(--red)' }}>*</span></span>
      <div className={`multi${error ? ' bad' : ''}`}>
        <span className="help">{help}</span>
        <div className="pills">
          {options.map((o) => (
            <button type="button" key={o.id} className="pill" aria-pressed={value.includes(o.id)} onClick={() => toggle(o.id)}>{o.label}</button>
          ))}
        </div>
      </div>
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}
