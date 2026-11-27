import { confirmar } from '../../../shared/services/feedback';
import type { Escalera, Espacio, Piso, RutaConsultada, Salida } from '../types';

/** Una escalera sirve para la ruta si está activa y disponible. */
export const escaleraUtil = (e: Escalera) => e.estado === 'ACTIVO' && e.disponibilidad === 'DISPONIBLE';

/** Una salida sirve para la ruta si está activa y disponible. */
export const salidaUtil = (s: Salida) => s.estado === 'ACTIVO' && s.disponible;

/** Mismo criterio que «Todo el edificio» en #/rutas: tiene guía con salida o una ruta escrita a mano. */
export const espacioListo = (r: RutaConsultada) => Boolean(r.guia?.salida) || r.tieneRuta;

/** Espacios activos de cada piso. */
export function espaciosPorPiso(espacios: Espacio[]): Map<string, number> {
  const conteo = new Map<string, number>();
  espacios.filter((s) => s.estado === 'ACTIVO').forEach((s) => conteo.set(s.pisoId, (conteo.get(s.pisoId) ?? 0) + 1));
  return conteo;
}

/**
 * Pisos activos desde los que se llega a una salida: los que tienen una salida útil o están unidos a uno de ellos por
 * escaleras útiles. Con `sinSalidaUsarBase` y ninguna salida, se toma como destino el piso 1 (o el más bajo), para
 * revisar las escaleras aunque falte la salida.
 */
export function pisosConectados(pisos: Piso[], escaleras: Escalera[], salidas: Salida[], sinSalidaUsarBase = true): Set<string> {
  const activos = pisos.filter((p) => p.estado === 'ACTIVO');
  const ids = new Set(activos.map((p) => p.id));
  const padre = new Map(activos.map((p) => [p.id, p.id]));
  const raiz = (id: string): string => {
    let actual = id;
    while (padre.get(actual) !== actual) actual = padre.get(actual)!;
    return actual;
  };
  escaleras.filter(escaleraUtil).forEach((e) => {
    const unidos = e.pisoIds.filter((id) => ids.has(id));
    for (let i = 1; i < unidos.length; i += 1) padre.set(raiz(unidos[i]), raiz(unidos[0]));
  });
  let destinos = salidas.filter(salidaUtil).map((s) => s.pisoId).filter((id) => ids.has(id));
  if (destinos.length === 0 && sinSalidaUsarBase) {
    const base = activos.find((p) => p.numero === 1) ?? [...activos].sort((a, b) => a.numero - b.numero)[0];
    destinos = base ? [base.id] : [];
  }
  const raices = new Set(destinos.map(raiz));
  return new Set(activos.filter((p) => raices.has(raiz(p.id))).map((p) => p.id));
}

/** Pisos activos con espacios activos que no quedan conectados a una salida por escaleras. */
export function pisosSinEscalera(pisos: Piso[], espacios: Espacio[], escaleras: Escalera[], salidas: Salida[]): Piso[] {
  const activos = pisos.filter((p) => p.estado === 'ACTIVO');
  if (activos.length < 2) return [];
  const conEspacios = espaciosPorPiso(espacios);
  const conectados = pisosConectados(pisos, escaleras, salidas);
  return activos.filter((p) => (conEspacios.get(p.id) ?? 0) > 0 && !conectados.has(p.id)).sort((a, b) => a.numero - b.numero);
}

/**
 * Espacios activos que hoy llegan a una salida y dejarían de hacerlo si se quita un piso, una salida o una escalera.
 * `salidas` deben ser las que ya tienen ruta exterior hasta una zona segura.
 */
export function espaciosAfectados(pisos: Piso[], espacios: Espacio[], escaleras: Escalera[], salidas: Salida[],
  quitar: { pisoId?: string; salidaId?: string; escaleraId?: string }): number {
  const conteo = espaciosPorPiso(espacios);
  const antes = pisosConectados(pisos, escaleras, salidas, false);
  const despues = pisosConectados(
    pisos.filter((p) => p.id !== quitar.pisoId),
    escaleras.filter((e) => e.id !== quitar.escaleraId),
    salidas.filter((s) => s.id !== quitar.salidaId),
    false,
  );
  let total = 0;
  antes.forEach((id) => { if (!despues.has(id)) total += conteo.get(id) ?? 0; });
  return total;
}

/** Confirmación antes de inactivar algo de lo que dependen rutas (piso, salida o escalera). */
export function confirmarInactivar(que: string, accion: string, afectados: number | null): Promise<boolean> {
  const cuantos = afectados === null
    ? ''
    : afectados === 0
      ? ' Con los datos de esta pantalla, ningún espacio pierde su ruta.'
      : ` Con los datos de esta pantalla, ${afectados === 1 ? '1 espacio se quedaría' : `${afectados} espacios se quedarían`} sin ruta.`;
  return confirmar({
    titulo: `¿Inactivar ${que}?`,
    texto: `Los espacios que dependen de esto podrían quedarse sin ruta de evacuación.${cuantos} Puede reactivarlo después.`,
    accion,
    peligro: true,
  });
}

/** «el piso 3», «los pisos 3 y 4», «los pisos 2, 3 y 4». */
export function listaPisos(pisos: Piso[]): string {
  const numeros = pisos.map((p) => String(p.numero));
  if (numeros.length === 1) return `el piso ${numeros[0]}`;
  return `los pisos ${numeros.slice(0, -1).join(', ')} y ${numeros[numeros.length - 1]}`;
}

/** Desplaza la página hasta un elemento; con «menos movimiento» lo hace sin animar (docs/PATRONES-UI.md). */
export function irA(id: string) {
  const elemento = document.getElementById(id);
  if (!elemento) return;
  const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  elemento.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' });
}

/** Sección del detalle que se puede abrir desde la lista de verificación. */
export interface Abrible { abrir: () => void }

/** La sección de escaleras, además, crea de un clic la escalera principal que conecta todos los pisos activos. */
export interface ManejoEscaleras extends Abrible { crearPrincipal: () => Promise<void> }

export const TEXTO_ESCALERA_PRINCIPAL = 'Crear escalera principal que conecta todos los pisos';

/** Lleva a una sección y pone el foco en su primer campo cuando el formulario ya se dibujó. */
export function abrirEn(seccionId: string, campoId?: string) {
  requestAnimationFrame(() => {
    irA(seccionId);
    if (campoId) document.getElementById(campoId)?.focus({ preventScroll: true });
  });
}
