import { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '../../../shared/hooks/useAutoRefresh';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import SeguimientoEvento from '../components/SeguimientoEvento';
import { checkinApi } from '../services/checkin';
import type { Evento } from '../types';
import { fechaHora, textoEstadoEvento, tipoEvento } from '../utils/labels';
import '../styles/checkin.css';

/**
 * Panel del evento para el personal (RF-MS04-06 a RF-MS04-12). Con ms04:dashboard:read: consolidado, personas por
 * estado, pendientes y quienes requieren asistencia; con ms04:history:read, además el historial y los resultados. MS04
 * limita al brigadista a sus zonas (RN-MS04-14). El contenido es el mismo que muestra «Ver en vivo» en Eventos.
 */
export default function PanelEvento({ session, eventoId }: { session: Session; eventoId: string }) {
  const [ev, setEv] = useState<Evento | null>(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    checkinApi.evento(session, eventoId)
      .then((d) => { if (vigente) { setEv(d); setError(''); } })
      .catch((err: unknown) => { if (vigente) setError(errorMessage(err)); });
    return () => { vigente = false; };
  }, [session, eventoId, intento]);
  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  // Mientras el evento está en ejecución, el seguimiento se actualiza solo cada 15 s
  const tick = useAutoRefresh(ev?.estado === 'EN_EJECUCION');

  return (
    <>
      <PageHeader
        badge={ev ? `${tipoEvento(ev.simulacro)} · ${textoEstadoEvento(ev.estado)}`.toUpperCase() : 'EVACUACIÓN'}
        title={ev?.nombre ?? 'Panel del evento'}
        subtitle="Estado de las personas convocadas"
        context={ev?.fecha_inicio ? `Inicio: ${fechaHora(ev.fecha_inicio)}` : undefined}
      />
      <main className="content">
        <a className="chk-volver" href="#/evacuacion/eventos">← Volver a los eventos</a>
        {error && (
          <div className="chk-error">
            <p className="notice err" role="alert">{error}</p>
            <button type="button" className="btn white chk-retry" onClick={reintentar}>Intentar de nuevo</button>
          </div>
        )}
        <SeguimientoEvento session={session} eventoId={eventoId} refresco={tick} />
      </main>
    </>
  );
}
