import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { checkinApi } from '../services/checkin';
import type { Evento } from '../types';
import { fechaHora, tipoEvento } from '../utils/labels';
import '../styles/checkin.css';

/** Mensaje de la pantalla inicial cuando no hay evento activo que le aplique al usuario (RNF-MS04-07). */
export const SIN_EVENTO_ACTIVO = 'No hay ningún evento activo.';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; eventos: Evento[] }
  | { estado: 'error'; mensaje: string };

/**
 * RF-MS04-01 Consultar eventos activos: los simulacros o emergencias en ejecución que convocan alguno de los roles
 * del usuario, ordenados por fecha de inicio. Si no hay ninguno, lo indica sin pasos adicionales; si hay uno, abre
 * directo su reporte de estado; si hay varios, el usuario elige en cuál reportar.
 */
export default function EventosActivos({ session }: { session: Session }) {
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    checkinApi.eventosActivos(session)
      .then((eventos) => {
        if (!vigente) return;
        // Con un solo evento se abre directo su reporte, para no sumar un paso (RNF-MS04-07). replace: al volver
        // atrás no se regresa a esta pantalla, que lo abriría otra vez
        if (eventos.length === 1) {
          window.location.replace(`#/checkin/${encodeURIComponent(eventos[0].evento_id)}`);
          return;
        }
        setCarga({ estado: 'listo', eventos });
      })
      .catch((err: unknown) => { if (vigente) setCarga({ estado: 'error', mensaje: errorMessage(err) }); });
    return () => { vigente = false; };
  }, [session, intento]);

  const reintentar = () => {
    setCarga({ estado: 'cargando' });
    setIntento((n) => n + 1);
  };

  return (
    <>
      <PageHeader badge="CHECK-IN" title="Reportar mi estado" subtitle="Eventos activos que te aplican" />
      <main className="content">
        {carga.estado === 'cargando' && <p className="notice" role="status">Consultando los eventos activos…</p>}

        {carga.estado === 'error' && (
          <>
            <p className="notice err" role="alert">{carga.mensaje}</p>
            <button type="button" className="btn white chk-retry" onClick={reintentar}>Intentar de nuevo</button>
          </>
        )}

        {carga.estado === 'listo' && carga.eventos.length === 0 && (
          <p className="notice" role="status">{SIN_EVENTO_ACTIVO}</p>
        )}

        {carga.estado === 'listo' && carga.eventos.length > 0 && (
          <ul className="chk-eventos" aria-label="Eventos activos">
            {carga.eventos.map((evento) => (
              <li key={evento.evento_id} className="chk-evento">
                <span className="tag">{tipoEvento(evento.simulacro).toUpperCase()}</span>
                <h3>{evento.nombre}</h3>
                <div className="chk-meta">
                  {evento.fecha_inicio && <span>Iniciado: <b>{fechaHora(evento.fecha_inicio)}</b></span>}
                  {evento.escenario.edificios.length > 0 && (
                    <span>Edificios: <b>{evento.escenario.edificios.join(', ')}</b></span>
                  )}
                  {evento.escenario.zonas.length > 0 && <span>Zonas: <b>{evento.escenario.zonas.join(', ')}</b></span>}
                </div>
                <a className="btn red chk-ir" href={`#/checkin/${encodeURIComponent(evento.evento_id)}`}>
                  Reportar mi estado
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
