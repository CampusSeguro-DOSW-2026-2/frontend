import { Calendar } from './Icons';

interface Props { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; disabled?: boolean; placeholder?: string }

// Formato del mockup: "12 oct 2026 · 10:05 AM".
const formatDateTime = (v: string) => {
  const d = new Date(v);
  const month = d.toLocaleString('es-CO', { month: 'short' }).replace('.', '');
  return `${d.getDate()} ${month} ${d.getFullYear()} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

// El input nativo sigue debajo (teclado, selector y lectores de pantalla); sin foco se muestra el texto con formato.
export function DateTimeField({ id, value, onChange, invalid, disabled, placeholder = 'Selecciona fecha y hora' }: Props) {
  return (
    <div className={`input dt${invalid ? ' bad' : ''}`}>
      <Calendar />
      <input id={id} type="datetime-local" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      <span className={`dtv${value ? '' : ' empty'}`} aria-hidden="true">{value ? formatDateTime(value) : placeholder}</span>
    </div>
  );
}
