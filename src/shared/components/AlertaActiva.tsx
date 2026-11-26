import { useState } from 'react';
import { errorMessage } from '../services/http';
import { Check, TriangleAlert } from './Icons';
import { Mensaje } from './Mensaje';

export interface DatosAlertaActiva {
  titulo: string;
  /** Texto libre de la alerta: cada línea es un paso. */
  instrucciones: string;
  /** Lugares a los que se dirige, ya en texto legible («Edificio A · Zona norte»). */
  alcance?: string;
  /** Hora de inicio, ya formateada en es-CO. */
  iniciada?: string;
  /** Alerta operativa (no de emergencia): cambia el título de las instrucciones. */
  operativa?: boolean;
  confirmada: boolean;
}

interface Props {
  alerta: DatosAlertaActiva;
  /** Registra la recepción en el servicio de alertas. Si falla, se muestra el error con «Reintentar». */
  onConfirmar: () => Promise<unknown>;
  /** Muestra el título de la alerta en la tarjeta; se omite cuando el encabezado de la página ya lo dice. */
  mostrarTitulo?: boolean;
  /** Nota bajo la confirmación (p. ej. que es un registro de demostración). */
  nota?: string;
}

const pasosDe = (texto: string) => texto.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);

/**
 * Alerta activa dirigida a la persona: las instrucciones como pasos numerados y la acción principal «Confirmar
 * recepción». Una vez confirmada se reduce a una línea (título y «Recepción confirmada») que se abre para ver las
 * instrucciones, así lo que sigue (el check-in en Inicio) queda a la vista. La usan la pantalla de inicio (MS04) y la
 * pantalla de la alerta activa (MS03); quien la monta le pasa la operación de confirmar de MS03, así este componente
 * no depende de ningún módulo.
 */
export function AlertaActiva({ alerta, onConfirmar, mostrarTitulo = true, nota }: Props) {
  const [enviando, setEnviando] = useState(false);
  // Se recuerda la confirmación aunque el próximo refresco aún traiga el dato anterior
  const [hecha, setHecha] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const confirmada = alerta.confirmada || hecha;
  const pasos = pasosDe(alerta.instrucciones);

  const confirmar = async () => {
    if (confirmada || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar();
      setHecha(true);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  const tituloInstrucciones = alerta.operativa ? 'Instrucciones' : 'Instrucciones de emergencia';
  const listaPasos = pasos.length > 0 && (
    <ol className="alerta-activa-pasos">
      {pasos.map((p, i) => <li key={`${i}-${p}`}>{p}</li>)}
    </ol>
  );

  // Ya confirmada, la tarjeta se reduce a una línea para que lo siguiente (el check-in) quede a la vista; las
  // instrucciones siguen disponibles al abrirla
  if (confirmada) {
    return (
      <details className="alerta-activa confirmada">
        <summary>
          <span className="alerta-activa-ok" aria-hidden="true"><Check /></span>
          <span className="alerta-activa-linea">
            <b>{alerta.titulo}</b>
            <small>Recepción confirmada{nota ? ` ${nota}` : ''} · Ver instrucciones</small>
          </span>
        </summary>
        {/* Anuncia la confirmación recién hecha; al volver a Inicio no se repite */}
        {hecha && <span className="sr-only" role="status">Recepción confirmada.</span>}
        <div className="alerta-activa-detalle">
          {(alerta.alcance || alerta.iniciada) && (
            <p className="alerta-activa-meta">{[alerta.alcance, alerta.iniciada && `Iniciada: ${alerta.iniciada}`].filter(Boolean).join(' · ')}</p>
          )}
          <h3 className="alerta-activa-sub">{tituloInstrucciones}</h3>
          {listaPasos}
        </div>
      </details>
    );
  }

  return (
    <section className="alerta-activa" aria-labelledby="alerta-activa-titulo">
      <div className="alerta-activa-cab">
        <span className="alerta-activa-ico" aria-hidden="true"><TriangleAlert /></span>
        <div>
          <span className="alerta-activa-tag">Alerta activa</span>
          <h2 id="alerta-activa-titulo">{mostrarTitulo ? alerta.titulo : tituloInstrucciones}</h2>
          {(alerta.alcance || alerta.iniciada) && (
            <p className="alerta-activa-meta">{[alerta.alcance, alerta.iniciada && `Iniciada: ${alerta.iniciada}`].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      </div>

      {pasos.length > 0 && (
        <>
          {mostrarTitulo && <h3 className="alerta-activa-sub">{tituloInstrucciones}</h3>}
          {listaPasos}
        </>
      )}

      <button type="button" className="btn red alerta-activa-btn" onClick={() => void confirmar()} disabled={enviando}
        aria-busy={enviando}>
        <Check />{enviando ? 'Confirmando…' : 'Confirmar recepción'}
      </button>
      {error !== null && (
        <Mensaje tono="error" compacto onReintentar={() => void confirmar()}>{errorMessage(error)}</Mensaje>
      )}
    </section>
  );
}
