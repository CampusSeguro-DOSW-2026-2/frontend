import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  titulo: ReactNode;
  children: ReactNode;
  /** Botones del pie: primero la acción principal (.btn.red) y después «Cancelar» (.btn.white), como confirmar(). */
  botones: ReactNode;
  onCerrar: () => void;
  /** Mientras se guarda, Escape y el fondo no cierran la ventana. */
  ocupado?: boolean;
}

/**
 * Ventana modal de MS05 con el mismo comportamiento que confirmar() (shared/components/Feedback.tsx): <dialog> nativo con
 * showModal, que encierra el foco, cierra con Escape y deja el fondo inerte; al cerrar, el foco vuelve a donde estaba.
 * El foco empieza en el elemento con `data-foco` o, si no hay, en el primer campo. En celular se muestra como hoja.
 */
export default function Dialogo({ titulo, children, botones, onCerrar, ocupado = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return undefined;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogo.showModal();
    (dialogo.querySelector<HTMLElement>('[data-foco]')
      ?? dialogo.querySelector<HTMLElement>('input:checked, input, select, textarea, button'))?.focus();
    return () => {
      if (dialogo.open) dialogo.close();
      previo?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialogo dlg-ms05"
      aria-labelledby={`${id}-t`}
      onCancel={(e) => { e.preventDefault(); if (!ocupado) onCerrar(); }}
      onClick={(e) => { if (e.target === ref.current && !ocupado) onCerrar(); }}
    >
      <div className="dialogo-cuerpo">
        <h2 id={`${id}-t`}>{titulo}</h2>
        <div className="dialogo-texto">{children}</div>
      </div>
      <div className="dialogo-botones">{botones}</div>
    </dialog>
  );
}
