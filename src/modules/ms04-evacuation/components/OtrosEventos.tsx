import { CalendarIcon } from '../../../shared/components/Icons';
import { VerMas } from '../../../shared/components/VerMas';
import { useVerMas } from '../../../shared/hooks/useVerMas';
import type { Evento } from '../types';
import { fechaHora, tipoEvento } from '../utils/labels';
import '../styles/checkin.css';

/**
 * Tarjeta de la pantalla de inicio con los demás eventos en ejecución: cada uno con su tipo, nombre y hora de inicio, y
 * un botón para verlo en Inicio en lugar del actual. Sin otros eventos no se muestra.
 */
export function OtrosEventos({ eventos, onElegir, recienteId }: {
  eventos: Evento[]; onElegir: (eventoId: string) => void;
  /** Evento en curso más reciente: si está en la lista, lleva la marca «Más reciente». */
  recienteId?: string;
}) {
  // Con muchos eventos en curso se ven los más recientes y el resto se despliega aquí mismo
  const { visibles, restantes, verTodos } = useVerMas(eventos);
  if (eventos.length === 0) return null;
  const titulo = eventos.length === 1 ? 'Hay 1 evento más en curso' : `Hay ${eventos.length} eventos más en curso`;
  return (
    <section className="chk-otros" aria-labelledby="chk-otros-titulo">
      <div className="chk-otros-cab">
        <span className="chk-otros-ico" aria-hidden="true"><CalendarIcon /></span>
        <div>
          <h2 id="chk-otros-titulo">{titulo}</h2>
          <p className="chk-sub">Elija uno para ver su información y reportar su estado en él.</p>
        </div>
      </div>
      <ul aria-label="Otros eventos en curso">
        {visibles.map((e) => (
          <li key={e.evento_id} className="chk-otro">
            <span className="tag">{tipoEvento(e.simulacro).toUpperCase()}</span>
            <div className="chk-otro-txt">
              <b>{e.nombre}{e.evento_id === recienteId && <span className="chk-ev-sel-nota chk-otro-nota">Más reciente</span>}</b>
              {e.fecha_inicio && <small>Iniciado: {fechaHora(e.fecha_inicio)}</small>}
            </div>
            <button type="button" className="btn white chk-otro-ir" onClick={() => onElegir(e.evento_id)}>
              Ver este evento →
            </button>
          </li>
        ))}
      </ul>
      <VerMas restantes={restantes} onClick={verTodos} />
    </section>
  );
}
