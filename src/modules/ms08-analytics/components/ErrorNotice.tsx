import { ApiError, errorMessage } from '../../../shared/services/http';

/**
 * Error de una consulta a MS08. Muestra solo el mensaje para la persona; el identificador de la petición
 * (correlation_id) queda en la consola del navegador para soporte, no en pantalla.
 */
export default function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = errorMessage(error);
  if (error instanceof ApiError && error.correlationId) console.warn(`MS08: ${error.code || error.status} (correlation_id ${error.correlationId})`);
  return (
    <div className="notice err" role="alert">
      <p>{message}</p>
      {onRetry && <button type="button" className="plink" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}
