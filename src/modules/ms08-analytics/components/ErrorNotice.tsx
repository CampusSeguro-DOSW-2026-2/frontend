import { ApiError, errorMessage } from '../../../shared/services/http';

/**
 * Error de una consulta a MS08 (formato estándar 7.1: status, codigo, mensaje, errores, correlation_id).
 * Siempre muestra el correlation_id para que soporte pueda rastrear la petición.
 */
export default function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = errorMessage(error);
  const reference = error instanceof ApiError ? error.correlationId : '';
  // Los errores 5xx ya traen la referencia en el mensaje (shared/services/http.ts)
  const showReference = reference && !message.includes(reference);
  return (
    <div className="notice err" role="alert">
      <p>{message}</p>
      {showReference && <p className="an-ref">Referencia para soporte: <code>{reference}</code></p>}
      {onRetry && <button type="button" className="plink" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}
