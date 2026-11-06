import { ApiError, request } from '../../../shared/services/http';
import { getSession } from '../../../shared/services/session';

/**
 * Cliente de MS03 (Alertas) a través del API Gateway.
 *
 * MS03 ya no valida JWT ni expone CORS: el Gateway verifica el token de MS01 e inyecta la identidad
 * (X-User-Id, X-User-Role). Por eso aquí solo se firma con la sesión del usuario y se reutiliza el
 * cliente compartido (`shared/services/http.ts`), que ya entiende el ErrorResponse estándar
 * { status, codigo, mensaje, errores[{ campo, mensaje }], correlation_id }.
 */

// Códigos de dominio de MS03 que el cliente compartido no conoce. Los demás (VALIDACION, NO_AUTENTICADO,
// NO_ENCONTRADO, ERROR_INTERNO...) los traduce http.ts.
const MESSAGES: Record<string, string> = {
  VALIDACION: 'Revisa los campos marcados.',
  REFERENCIA_INVALIDA: 'Algún edificio, zona o destinatario no existe en el catálogo.',
  PAGINACION_INVALIDA: 'Los parámetros de consulta no son válidos.',
  FECHA_ACTIVACION_INVALIDA: 'La fecha de inicio debe ser futura.',
  PROHIBIDO: 'No tienes permiso para realizar esta acción.',
  NO_ES_DESTINATARIO: 'No eres destinatario de esta alerta.',
  ALERTA_NO_ENCONTRADA: 'La alerta no existe.',
  ESTADO_ALERTA_INVALIDO: 'La alerta ya no se puede modificar en su estado actual.',
  TRANSICION_INVALIDA: 'La alerta ya no admite esa acción en su estado actual.',
  ALERTA_NO_ACTIVA: 'La alerta no está activa.',
  SIMULACION_DUPLICADA: 'Ya existe una alerta para este simulacro con otros datos.',
  MODIFICACION_CONCURRENTE: 'Otra persona modificó la alerta. Recarga e inténtalo de nuevo.',
  SERVICIO_EXTERNO_NO_DISPONIBLE: 'Un servicio del campus no está disponible. Inténtalo más tarde.',
};

export async function ms03<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown): Promise<T> {
  try {
    return (await request(path, { method, body, session: getSession() ?? undefined })) as T;
  } catch (e) {
    const message = e instanceof ApiError ? MESSAGES[e.code] : undefined;
    if (e instanceof ApiError && message) {
      throw new ApiError(e.status, message, e.fields, e.code, e.details, e.correlationId);
    }
    throw e;
  }
}
