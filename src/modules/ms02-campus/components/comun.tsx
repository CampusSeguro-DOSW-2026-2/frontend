import { Mensaje } from '../../../shared/components/Mensaje';
import type { ReactNode } from 'react';
import type { CampusApiError } from '../services/campus';

export function Falla({ error }: { error: CampusApiError }) {
  return (
    <Mensaje tono="error">
      {error.message}
    </Mensaje>
  );
}

export function Campo({ id, etiqueta, error, children }: { id: string; etiqueta: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{etiqueta}</label>
      <div className={`input${error ? ' bad' : ''}`}>{children}</div>
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

/** Pie de los formularios de administración: la acción repite el objeto («Guardar edificio»), nunca «Guardar» solo. */
export function Botones({ guardando, onCancelar, accion }: { guardando: boolean; onCancelar: () => void; accion: string }) {
  return (
    <div className="cs-form-botones">
      <button type="submit" className="cs-mini primario" disabled={guardando} aria-busy={guardando || undefined}>{guardando ? 'Guardando…' : accion}</button>
      <button type="button" className="cs-mini" onClick={onCancelar} disabled={guardando}>Cancelar</button>
    </div>
  );
}
