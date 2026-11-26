import type { ReactNode } from 'react';

/**
 * Confirmaciones y avisos breves de toda la aplicación. Se llaman desde cualquier pantalla sin hooks ni contexto:
 *
 *   if (await confirmar({ titulo: '¿Archivar la alerta?', accion: 'Archivar alerta', peligro: true })) { ... }
 *   avisar({ tono: 'exito', texto: 'Edificio inactivado.', deshacer: () => campus.edificios.reactivar(id) });
 *
 * `FeedbackHost` (shared/components/Feedback.tsx) los muestra; App lo monta una sola vez.
 *
 * Reglas (docs/PATRONES-UI.md): confirmar solo lo de alto impacto o irreversible; «Deshacer» solo cuando el servicio ya
 * tiene la operación inversa (p. ej. reactivar después de inactivar). Si no la tiene, solo el aviso de éxito.
 */

export interface OpcionesConfirmar {
  /** Pregunta concreta: «¿Archivar la alerta “Simulacro de sismo”?» */
  titulo: string;
  /** Qué pasará y si se puede deshacer. */
  texto?: ReactNode;
  /** Verbo y objeto de la acción: «Archivar alerta». */
  accion: string;
  /** Texto del botón para no hacer nada; por defecto «Cancelar». */
  cancelar?: string;
  /** Acción destructiva o de alto impacto: el foco inicial queda en «Cancelar». */
  peligro?: boolean;
}

export type TonoAviso = 'exito' | 'error' | 'aviso' | 'info';

export interface OpcionesAviso {
  texto: string;
  tono?: TonoAviso;
  /** Operación inversa que ya existe en el servicio. Sin ella no se muestra «Deshacer». */
  deshacer?: () => unknown;
  textoDeshacer?: string;
  /** Milisegundos visibles; por defecto 5 s, u 8 s si se puede deshacer. */
  duracion?: number;
}

export interface ConfirmacionPendiente extends OpcionesConfirmar { id: number; resolver: (ok: boolean) => void }
export interface AvisoVisible extends OpcionesAviso { id: number }
export interface EstadoFeedback { confirmacion: ConfirmacionPendiente | null; avisos: AvisoVisible[] }

const MAX_AVISOS = 3;
let estado: EstadoFeedback = { confirmacion: null, avisos: [] };
let siguienteId = 1;
let anfitriones = 0;
const oyentes = new Set<() => void>();

function cambiar(nuevo: Partial<EstadoFeedback>) {
  estado = { ...estado, ...nuevo };
  oyentes.forEach((f) => f());
}

export function suscribirFeedback(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

export const leerFeedback = (): EstadoFeedback => estado;

/** Lo llama FeedbackHost al montarse y desmontarse. */
export function registrarAnfitrion(): () => void {
  anfitriones += 1;
  return () => { anfitriones -= 1; };
}

/** Pide confirmación con el diálogo propio. Resuelve `true` si la persona confirma. */
export function confirmar(opciones: OpcionesConfirmar): Promise<boolean> {
  // Sin anfitrión montado (no debería pasar) no se ejecuta la acción: es lo más seguro
  if (anfitriones === 0) return Promise.resolve(false);
  return new Promise<boolean>((resolver) => {
    estado.confirmacion?.resolver(false);
    cambiar({ confirmacion: { ...opciones, id: siguienteId++, resolver } });
  });
}

/** Cierra la confirmación abierta con la respuesta de la persona. */
export function responderConfirmacion(ok: boolean): void {
  const pendiente = estado.confirmacion;
  if (!pendiente) return;
  cambiar({ confirmacion: null });
  pendiente.resolver(ok);
}

/** Muestra un aviso breve (éxito, error, aviso o información), con «Deshacer» opcional. */
export function avisar(opciones: OpcionesAviso): void {
  if (anfitriones === 0) return;
  cambiar({ avisos: [...estado.avisos.slice(-(MAX_AVISOS - 1)), { ...opciones, id: siguienteId++ }] });
}

export function quitarAviso(id: number): void {
  cambiar({ avisos: estado.avisos.filter((a) => a.id !== id) });
}
