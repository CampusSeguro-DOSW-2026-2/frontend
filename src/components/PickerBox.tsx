import { useState } from 'react';
import { Close, Plus } from './Icons';
import type { CatalogItem } from '../services/catalog';

interface Props {
  label: string; required?: boolean; help: string; editLabel: string; items: CatalogItem[];
  selected: string[]; onToggle: (id: string) => void; error?: string; disabled?: boolean;
}

export function PickerBox({ label, required, help, editLabel, items, selected, onToggle, error, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <div className="pgroup">
      <span className="plabel">{label}{required && <span className="req"> *</span>}</span>
      <div className={`pbox${error ? ' bad' : ''}`}>
        <span className="help">{help}</span>
        <div className="pills">
          {items.filter((i) => selected.includes(i.id)).map((i) => (
            <span className="chip2" key={i.id}>{i.label}
              {!disabled && <button type="button" aria-label={`Quitar ${i.label}`} onClick={() => onToggle(i.id)}><Close /></button>}
            </span>
          ))}
        </div>
        {!disabled && <button type="button" className="plink" aria-expanded={open} onClick={() => setOpen(!open)}><Plus />{open ? 'Cerrar selección' : editLabel}</button>}
        {open && groups.map((g) => (
          <div key={g} className="opts"><small>{g}</small>
            <div className="pills">{items.filter((i) => i.group === g).map((i) => (
              <button type="button" key={i.id} className="pill" aria-pressed={selected.includes(i.id)} onClick={() => onToggle(i.id)}>{i.label}</button>
            ))}</div>
          </div>
        ))}
      </div>
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}
