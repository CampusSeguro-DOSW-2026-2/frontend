import type { ReactNode } from 'react';
import { ApiError, errorMessage } from '../services/http';
import { CircleCheck, CircleInfo, CircleX, TriangleAlert } from './Icons';

export type TonoMensaje = 'exito' | 'error' | 'aviso' | 'info';

interface Props {
  /** Tono del mensaje. Si llega `error` y no se indica, es «error». */
  tono?: TonoMensaje;
  titulo?: ReactNode;
  /** Texto del mensaje. Con `error` y sin texto, se muestra el mensaje ya preparado por el cliente HTTP. */
  children?: ReactNode;
  /** Error de una consulta: se muestra su mensaje y el código para soporte (correlation_id). */
  error?: unknown;
  /** Muestra «Reintentar» (o `textoReintentar`) como siguiente paso. */
  onReintentar?: () => void;
  textoReintentar?: string;
  /** Otras acciones (enlaces o botones .plink) debajo del texto. */
  acciones?: ReactNode;
  compacto?: boolean;
  id?: string;
  className?: string;
}

const ICONO: Record<TonoMensaje, () => ReactNode> = {
  exito: CircleCheck,
  error: CircleX,
  aviso: TriangleAlert,
  info: CircleInfo,
};

/**
 * Mensaje único de la aplicación: éxito, error, aviso o información. El tono se comunica con icono y texto, no solo con
 * el color. Los errores se anuncian de inmediato (role="alert"); el resto, de forma cortés (role="status").
 * Reemplaza a .notice, .notice.err, .notice2, cs-alert, Falla y ErrorNotice.
 */
export function Mensaje({
  tono, titulo, children, error, onReintentar, textoReintentar = 'Reintentar', acciones, compacto = false, id, className,
}: Props) {
  const t: TonoMensaje = tono ?? (error !== undefined ? 'error' : 'info');
  const Icono = ICONO[t];
  const texto = children ?? (error !== undefined ? errorMessage(error) : null);
  const soporte = error instanceof ApiError && error.correlationId ? error.correlationId : '';
  const clases = ['msj', t, compacto ? 'compacto' : '', className ?? ''].filter(Boolean).join(' ');

  return (
    <div id={id} className={clases} role={t === 'error' ? 'alert' : 'status'}>
      <Icono />
      <div className="msj-cuerpo">
        {titulo && <p className="msj-titulo">{titulo}</p>}
        {texto && <div>{texto}</div>}
        {soporte && <small className="msj-soporte">Código para soporte: {soporte}</small>}
        {(onReintentar || acciones) && (
          <div className="msj-acciones">
            {onReintentar && <button type="button" className="plink" onClick={onReintentar}>{textoReintentar}</button>}
            {acciones}
          </div>
        )}
      </div>
    </div>
  );
}
