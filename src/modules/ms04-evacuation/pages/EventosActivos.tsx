import { useEffect, useState } from 'react';
import { Cargando } from '../../../shared/components/Cargando';
import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { Mensaje } from '../../../shared/components/Mensaje';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { checkinApi } from '../services/checkin';
import type { Evento } from '../types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { fechaHora, textoEscenario, tipoEvento } from '../utils/labels';
import '../styles/checkin.css';

/** Mensaje de la pantalla inicial cuando no hay evento activo que le aplique al usuario (RNF-MS04-07). */
export const SIN_EVENTO_ACTIVO = 'No hay ningún evento activo';

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
  // Nombres de MS02 para los eventos guardados con ids; si MS02 no responde, se muestra el texto de MS04
  const { catalog } = useScopeCatalog();

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
      <PageHeader badge="CHECK-IN" title="Reportar mi estado" subtitle="Eventos activos que le aplican" />
      <main className="content">
        {carga.estado === 'cargando' && <Cargando texto="Consultando los eventos activos…" />}

        {carga.estado === 'error' && <Mensaje tono="error" onReintentar={reintentar}>{carga.mensaje}</Mensaje>}

        {carga.estado === 'listo' && carga.eventos.length === 0 && (
          <EstadoVacio titulo={SIN_EVENTO_ACTIVO}>
            Cuando empiece un simulacro o una emergencia que lo convoque, podrá reportar su estado aquí.
          </EstadoVacio>
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
                    <span>Edificios: <b>{textoEscenario(evento.escenario.edificios, catalog)}</b></span>
                  )}
                  {evento.escenario.zonas.length > 0 && <span>Zonas: <b>{textoEscenario(evento.escenario.zonas, catalog)}</b></span>}
                </div>
                <a className="btn red chk-ir" href={`#/checkin/${encodeURIComponent(evento.evento_id)}`}>
                  Abrir evento
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
