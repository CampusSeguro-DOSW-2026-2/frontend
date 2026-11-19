import { PRIORIDADES } from '../types';

/** Texto y clase CSS de cada estado de un incidente de MS05. */
const ESTADOS: Record<string, string> = {
  REPORTADO: 'Reportado',
  ASIGNADO: 'Asignado',
  EN_ATENCION: 'En atención',
  RESUELTO: 'Resuelto',
  CERRADO: 'Cerrado',
};

export const estadoIncidente = (estado: string) => ({ texto: ESTADOS[estado] ?? estado, clase: estado });

/**
 * Prioridad de MS05 (llega como código, p. ej. EMERGENCIA) con su texto; una desconocida se muestra tal cual con el
 * estilo de poca urgencia.
 */
export function prioridadDe(codigo: string): { codigo: string; label: string } {
  const p = PRIORIDADES.find((x) => x.codigo === codigo.toUpperCase() || x.label.toUpperCase() === codigo.toUpperCase());
  return p ? { codigo: p.codigo, label: p.label } : { codigo: 'POCA_URGENCIA', label: codigo };
}

/** "Hace 4 min", "Hace 2 h" o "Hace 3 d" a partir de una fecha ISO. */
export function hace(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `Hace ${h} h` : `Hace ${Math.round(h / 24)} d`;
}
