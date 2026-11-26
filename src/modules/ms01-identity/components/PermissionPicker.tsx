import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { useState } from 'react';
import { Search } from '../../../shared/components/Icons';
import { MODULE_LABEL, PERMISSION_LABEL } from '../utils/labels';
import type { PermissionItem } from '../types';
import '../styles/users.css';

interface Props {
  id: string;
  /** Catálogo de permisos (GET /permissions). */
  catalog: PermissionItem[];
  value: string[];
  onChange: (permissions: string[]) => void;
  /** Permisos con los que el rol empezó: sirven para mostrar qué se agrega y qué se quita. */
  baseline: string[];
  /** Permisos que el rol conserva siempre: se muestran marcados y no se pueden quitar (RN-MS01-41). */
  locked: string[];
  /** Permisos que este rol no puede tener: se muestran deshabilitados (RN-MS01-30). */
  forbidden: string[];
  error?: string;
  disabled?: boolean;
}

const moduleOf = (code: string) => code.split(':')[0];
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const labelOf = (item: PermissionItem) => item.description || PERMISSION_LABEL[item.code] || item.code;

/**
 * Selección de permisos del catálogo (F-10 y F-12): búsqueda, módulos plegables con su conteo y la opción de marcarlos
 * todos, filtro de los seleccionados y resumen de lo que se agrega y se quita antes de guardar. Repite en la interfaz las
 * reglas del back: los obligatorios no se pueden quitar y ms01:role:manage solo lo puede tener ADMIN.
 */
export function PermissionPicker({
  id, catalog, value, onChange, baseline, locked, forbidden, error, disabled = false,
}: Props) {
  const [search, setSearch] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  // Módulos abiertos: al empezar, los que ya tienen algún permiso marcado
  const [open, setOpen] = useState<Set<string>>(
    () => new Set([...value, ...locked].map(moduleOf)),
  );

  const isSelected = (code: string) => !forbidden.includes(code) && (locked.includes(code) || value.includes(code));
  const isEditable = (code: string) => !disabled && !locked.includes(code) && !forbidden.includes(code);
  const selected = catalog.filter((item) => isSelected(item.code));
  const added = selected.filter((item) => !baseline.includes(item.code));
  const removed = catalog.filter((item) => baseline.includes(item.code) && !isSelected(item.code));

  const query = normalize(search.trim());
  const visible = catalog.filter((item) => (!onlySelected || isSelected(item.code))
    && (query === '' || normalize(`${labelOf(item)} ${item.code}`).includes(query)));

  const groups = new Map<string, PermissionItem[]>();
  for (const item of visible) {
    const items = groups.get(moduleOf(item.code)) ?? [];
    items.push(item);
    groups.set(moduleOf(item.code), items);
  }

  const toggle = (code: string) =>
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);

  // Marca o desmarca todos los permisos editables del módulo
  const toggleModule = (module: string) => {
    const editable = catalog.filter((item) => moduleOf(item.code) === module && isEditable(item.code)).map((i) => i.code);
    const allOn = editable.every((code) => value.includes(code));
    onChange(allOn ? value.filter((c) => !editable.includes(c)) : [...new Set([...value, ...editable])]);
  };

  const toggleOpen = (module: string) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(module)) next.delete(module); else next.add(module);
    return next;
  });

  const msgId = `${id}-msg`;

  return (
    <div className="field" role="group" aria-labelledby={`${id}-label`} id={id} tabIndex={-1}>
      <span id={`${id}-label`} className="lbl">Permisos</span>

      <div className="picker-tools">
        <div className="input">
          <Search />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Busque un permiso por nombre o código" aria-label="Buscar permiso" maxLength={60} />
        </div>
        <label className="picker-only">
          <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} />
          Mostrar solo los seleccionados
        </label>
      </div>

      <div className="picker-summary" role="status">
        <span><b>{selected.length}</b> {selected.length === 1 ? 'permiso seleccionado' : 'permisos seleccionados'}</span>
        {added.length > 0 && <span className="plus">+{added.length} se agregan</span>}
        {removed.length > 0 && <span className="minus">−{removed.length} se quitan</span>}
        {(added.length > 0 || removed.length > 0) && (
          <button type="button" className="linkbtn" disabled={disabled} onClick={() => onChange(baseline)}>
            Deshacer cambios
          </button>
        )}
      </div>
      {(added.length > 0 || removed.length > 0) && (
        <ul className="picker-changes">
          {added.map((item) => <li key={item.code} className="plus">+ {labelOf(item)}</li>)}
          {removed.map((item) => <li key={item.code} className="minus">− {labelOf(item)}</li>)}
        </ul>
      )}

      <div className={`perm-groups picker${error ? ' bad' : ''}`}>
        {groups.size === 0 && <EstadoVacio titulo="Ningún permiso coincide con la búsqueda">Pruebe con otras palabras.</EstadoVacio>}
        {[...groups.entries()].map(([module, items]) => {
          const total = catalog.filter((item) => moduleOf(item.code) === module);
          const count = total.filter((item) => isSelected(item.code)).length;
          const editable = total.filter((item) => isEditable(item.code));
          const allOn = editable.length > 0 && editable.every((item) => value.includes(item.code));
          // Al buscar o filtrar, los módulos con resultados se muestran abiertos
          const expanded = open.has(module) || query !== '' || onlySelected;
          return (
            <section key={module} className="perm-group">
              <div className="picker-head">
                <button type="button" className="picker-toggle" aria-expanded={expanded} onClick={() => toggleOpen(module)}>
                  <span>{MODULE_LABEL[module] ?? module.toUpperCase()}</span>
                  <span className="count">{count} de {total.length}</span>
                </button>
                {editable.length > 0 && (
                  <button type="button" className="linkbtn" disabled={disabled} onClick={() => toggleModule(module)}>
                    {allOn ? 'Quitar todos' : 'Seleccionar todos'}
                  </button>
                )}
              </div>
              {expanded && (
                <ul>
                  {items.map((item) => (
                    <li key={item.code}>
                      <label>
                        <input
                          type="checkbox"
                          checked={isSelected(item.code)}
                          disabled={!isEditable(item.code)}
                          onChange={() => toggle(item.code)}
                          aria-describedby={error ? msgId : undefined}
                        />
                        <span>{labelOf(item)}</span>
                        {locked.includes(item.code) && <span className="tag">Obligatorio</span>}
                        {forbidden.includes(item.code) && <span className="tag">Solo ADMIN</span>}
                      </label>
                      <code>{item.code}</code>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {error && <span id={msgId} className="error" role="alert">{error}</span>}
    </div>
  );
}
