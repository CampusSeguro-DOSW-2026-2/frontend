import { prioridadDe } from '../utils/incidentes';
import '../styles/incidentes.css';

/**
 * Prioridad de un incidente con el mismo chip en todas las pantallas (panel del brigadista, seguimiento del evento,
 * atender, mis incidentes y reportar). Recibe el código de MS05 (EMERGENCIA, URGENCIA_MODERADA, POCA_URGENCIA).
 */
export default function PrioridadChip({ codigo, solido = false }: { codigo: string; solido?: boolean }) {
  const p = prioridadDe(codigo);
  return <span className={`rs-prio ${p.codigo}${solido ? ' solid' : ''}`}>{p.label}</span>;
}
