import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { errorMessage } from '../services/http';
import {
  avisar, leerFeedback, quitarAviso, registrarAnfitrion, responderConfirmacion, suscribirFeedback,
} from '../services/feedback';
import type { AvisoVisible, ConfirmacionPendiente, TonoAviso } from '../services/feedback';
import { CircleCheck, CircleInfo, CircleX, CloseIcon, TriangleAlert } from './Icons';

/**
 * Muestra el diálogo de confirmación y los avisos breves que piden confirmar() y avisar() (shared/services/feedback.ts).
 * App lo monta una sola vez.
 */
export function FeedbackHost() {
  const { confirmacion, avisos } = useSyncExternalStore(suscribirFeedback, leerFeedback);
  useEffect(() => registrarAnfitrion(), []);

  return (
    <>
      {confirmacion && <Dialogo key={confirmacion.id} datos={confirmacion} />}
      {/* La región existe siempre para que los lectores de pantalla anuncien cada aviso nuevo */}
      <ol className="avisos" aria-live="polite" aria-label="Avisos">
        {avisos.map((a) => <Aviso key={a.id} aviso={a} />)}
      </ol>
    </>
  );
}

/**
 * Diálogo modal nativo (<dialog> con showModal): el navegador encierra el foco, cierra con Escape y deja el fondo
 * inerte. Al cerrar, el foco vuelve a donde estaba. En celular se muestra como hoja desde abajo.
 */
function Dialogo({ datos }: { datos: ConfirmacionPendiente }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { titulo, texto, accion, cancelar = 'Cancelar', peligro = false, id } = datos;

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return undefined;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogo.showModal();
    // En una acción de alto impacto el foco empieza en «Cancelar» para que Enter no la confirme por accidente
    dialogo.querySelector<HTMLButtonElement>(peligro ? '[data-cancelar]' : '[data-confirmar]')?.focus();
    return () => {
      if (dialogo.open) dialogo.close();
      previo?.focus();
    };
  }, [peligro]);

  return (
    <dialog
      ref={ref}
      className={`dialogo${peligro ? ' peligro' : ''}`}
      aria-labelledby={`dlg-t-${id}`}
      aria-describedby={texto ? `dlg-d-${id}` : undefined}
      onCancel={(e) => { e.preventDefault(); responderConfirmacion(false); }}
      onClick={(e) => { if (e.target === ref.current) responderConfirmacion(false); }}
    >
      <div className="dialogo-cuerpo">
        <span className="dialogo-icono" aria-hidden="true">{peligro ? <TriangleAlert /> : <CircleInfo />}</span>
        <h2 id={`dlg-t-${id}`}>{titulo}</h2>
        {texto && <div id={`dlg-d-${id}`} className="dialogo-texto">{texto}</div>}
      </div>
      <div className="dialogo-botones">
        <button type="button" className="btn red" data-confirmar onClick={() => responderConfirmacion(true)}>{accion}</button>
        <button type="button" className="btn white" data-cancelar onClick={() => responderConfirmacion(false)}>{cancelar}</button>
      </div>
    </dialog>
  );
}

const ICONO: Record<TonoAviso, () => ReactNode> = { exito: CircleCheck, error: CircleX, aviso: TriangleAlert, info: CircleInfo };
const CLASE: Record<TonoAviso, string> = { exito: 'exito', error: 'error', aviso: 'aviso-tono', info: 'info' };

/** Aviso breve: se cierra solo, pero no mientras la persona lo tiene bajo el cursor o con el foco. */
function Aviso({ aviso }: { aviso: AvisoVisible }) {
  const { id, texto, tono = 'exito', deshacer, textoDeshacer = 'Deshacer', duracion } = aviso;
  const [pausado, setPausado] = useState(false);
  const Icono = ICONO[tono];

  useEffect(() => {
    if (pausado) return undefined;
    const t = window.setTimeout(() => quitarAviso(id), duracion ?? (deshacer ? 8000 : 5000));
    return () => window.clearTimeout(t);
  }, [pausado, id, duracion, deshacer]);

  const alDeshacer = async () => {
    quitarAviso(id);
    try {
      await deshacer?.();
      avisar({ tono: 'info', texto: 'Se deshizo el cambio.' });
    } catch (err) {
      avisar({ tono: 'error', texto: errorMessage(err) });
    }
  };

  return (
    <li
      className={`aviso ${CLASE[tono]}`}
      role={tono === 'error' ? 'alert' : undefined}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <Icono />
      <span className="aviso-texto">{texto}</span>
      {deshacer && <button type="button" className="aviso-accion" onClick={alDeshacer}>{textoDeshacer}</button>}
      <button type="button" className="aviso-cerrar" aria-label="Cerrar aviso" onClick={() => quitarAviso(id)}><CloseIcon /></button>
    </li>
  );
}
