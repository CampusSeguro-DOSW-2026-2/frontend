import type { ReactNode } from 'react';
import type { CampusApiError } from '../../services/campus';

export function Falla({ error }: { error: CampusApiError }) {
  return (
    <p className="cs-alert stop" role="alert">
      {error.message}
      {error.correlationId && <small>Código para soporte: {error.correlationId}</small>}
    </p>
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
