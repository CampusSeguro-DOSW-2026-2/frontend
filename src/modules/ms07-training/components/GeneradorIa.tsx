import { useEffect, useRef, useState } from 'react';
import { Mensaje } from '../../../shared/components/Mensaje';
import { ApiError, errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { trainingApi } from '../services/training';
import type { EvaluacionRequest } from '../types';

/** Cada cuánto se consulta el borrador y cuánto se espera como máximo (unos 60 s). */
const INTERVALO_MS = 1500;
const ESPERA_MAXIMA_MS = 60000;
const MINIMO = 3;
const MAXIMO = 10;
const POR_DEFECTO = 5;

const DEMORA = 'La IA está tardando más de lo normal. Intente de nuevo en unos minutos.';
const MUCHOS = 'Ya pidió varios borradores con IA en la última hora. Espere un rato y vuelva a intentarlo.';

function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError && (err.status === 429 || err.code === 'DEMASIADAS_SOLICITUDES')) return MUCHOS;
  return errorMessage(err);
}

const esperar = (ms: number) => new Promise((resolver) => { setTimeout(resolver, ms); });

/**
 * «Generar con IA» del editor de evaluaciones (RF-14, solo con ms07:content:manage). Pide a MS07 un borrador con los
 * contenidos activos de la categoría y lo consulta cada 1,5 s hasta que queda LISTO o FALLIDO. Generar puede tardar
 * más que el tiempo del Gateway, por eso MS07 responde enseguida (202) y el trabajo sigue en segundo plano.
 * El borrador nunca se guarda solo: `onListo` llena el formulario y el ADMIN guarda con el botón de siempre.
 * `antesDeGenerar` puede pedir confirmación; si responde false no se genera nada.
 */
export default function GeneradorIa({ session, categoria, disabled, antesDeGenerar, onListo }: {
  session: Session;
  categoria: string;
  disabled?: boolean;
  antesDeGenerar: () => Promise<boolean>;
  onListo: (borrador: EvaluacionRequest) => void;
}) {
  const [preguntas, setPreguntas] = useState(POR_DEFECTO);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  // Cada generación tiene su número: al cancelar o salir de la pantalla, la consulta en curso deja de contar
  const vuelta = useRef(0);

  useEffect(() => () => { vuelta.current += 1; }, []);

  const generar = async () => {
    setError('');
    if (!(await antesDeGenerar())) return;
    const mia = ++vuelta.current;
    const sigue = () => vuelta.current === mia;
    setGenerando(true);
    try {
      let estado = await trainingApi.pedirBorrador(session, { categoryId: categoria, questions: preguntas });
      const limite = Date.now() + ESPERA_MAXIMA_MS;
      while (estado.status === 'EN_PROCESO') {
        if (Date.now() >= limite) {
          if (sigue()) setError(DEMORA);
          return;
        }
        await esperar(INTERVALO_MS);
        if (!sigue()) return;
        estado = await trainingApi.borrador(session, estado.id);
        if (!sigue()) return;
      }
      if (!sigue()) return;
      if (estado.status === 'LISTO' && estado.draft) onListo(estado.draft);
      else setError(estado.message || 'No fue posible generar el borrador. Intente de nuevo.');
    } catch (err) {
      if (sigue()) setError(mensajeDeError(err));
    } finally {
      if (sigue()) setGenerando(false);
    }
  };

  const cancelar = () => {
    vuelta.current += 1;
    setGenerando(false);
  };

  return (
    <div className="evl-ia">
      <div className="evl-ia-fila">
        <label htmlFor="evl-ia-numero">Preguntas</label>
        <div className="input evl-ia-numero">
          <select id="evl-ia-numero" value={preguntas} disabled={generando}
            onChange={(e) => setPreguntas(Number(e.target.value))}>
            {Array.from({ length: MAXIMO - MINIMO + 1 }, (_, i) => MINIMO + i).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn white evl-ia-boton" onClick={() => void generar()}
          disabled={!categoria || generando || disabled} aria-describedby={categoria ? undefined : 'evl-ia-ayuda'}>
          <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
          </svg>
          {generando ? 'Generando…' : 'Generar con IA'}
        </button>
      </div>
      {!categoria && <span id="evl-ia-ayuda" className="evl-ia-ayuda">Elija una categoría para generar preguntas con sus contenidos.</span>}
      {generando && (
        <div className="evl-ia-estado" role="status">
          <span className="evl-ia-giro" aria-hidden="true" />
          <span>Generando preguntas con base en los contenidos de la categoría… puede tardar unos segundos.</span>
          <button type="button" className="evl-mini" onClick={cancelar}>Cancelar</button>
        </div>
      )}
      {error && <Mensaje tono="error" compacto>{error}</Mensaje>}
    </div>
  );
}
