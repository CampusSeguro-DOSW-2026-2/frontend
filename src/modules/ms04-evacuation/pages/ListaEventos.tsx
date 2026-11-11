import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { checkinApi } from '../services/checkin';
import type { EstadoEvento, EventoPage } from '../types';
import { ESTADOS_EVENTO, fechaHora, textoEstadoEvento, textoRol, tipoEvento } from '../utils/labels';
import '../styles/checkin.css';

/** Mensaje de la lista cuando no hay eventos, o ninguno con el estado elegido (F-07). */
export const SIN_EVENTOS = 'No hay eventos.';

const TAMANO_PAGINA = 20;

/**
 * RF-MS04-13 Consultar eventos (F-07): lista de solo lectura para BRIGADISTA, COORDINADOR, ORGANIZADOR y AUDITOR
 * (ms04:dashboard:read). Muestra los eventos en cualquier estado, con filtro por estado y paginación; un evento
 * solo lo cambia MS06 (RN-MS04-26).
 */
export default function ListaEventos({ session }: { session: Session }) {
  const [estado, setEstado] = useState<EstadoEvento | ''>('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<EventoPage | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    checkinApi.listarEventos(session, { estado: estado || undefined, page: pagina, size: TAMANO_PAGINA })
      .then((p) => { if (vigente) setDatos(p); })
      .catch((err: unknown) => { if (vigente) setError(errorMessage(err)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [session, estado, pagina, intento]);

  // Se marca la carga al cambiar el filtro, la página o al reintentar, no dentro del efecto
  const iniciarCarga = () => { setCargando(true); setError(''); };

  const eventos = datos?.contenido ?? [];

  return (
    <>
      <PageHeader badge="EVACUACIÓN" title="Eventos" subtitle="Simulacros y emergencias en cualquier estado" />
      <main className="content">
        <div className="chk-tabs" role="group" aria-label="Filtrar por estado">
          {ESTADOS_EVENTO.map((e) => (
            <button key={e.codigo || 'todos'} type="button" className="chk-tab" aria-pressed={estado === e.codigo}
              onClick={() => { setEstado(e.codigo); setPagina(0); iniciarCarga(); }}>
              {e.texto}
            </button>
          ))}
        </div>

        {error && (
          <>
            <p className="notice err" role="alert">{error}</p>
            <button type="button" className="btn white chk-retry" onClick={() => { setIntento((n) => n + 1); iniciarCarga(); }}>
              Intentar de nuevo
            </button>
          </>
        )}
        {cargando && !datos && !error && <p className="notice" role="status">Consultando los eventos…</p>}

        {datos && !error && eventos.length === 0 && <div className="chk-vacio" role="status">{SIN_EVENTOS}</div>}

        {!error && eventos.length > 0 && (
          <ul className="chk-eventos" aria-label="Eventos" aria-busy={cargando}>
            {eventos.map((evento) => (
              <li key={evento.evento_id} className={`chk-evento${evento.estado === 'EN_EJECUCION' ? ' vivo' : ''}`}>
                <div className="chk-evento-cab">
                  <span className="tag">{tipoEvento(evento.simulacro).toUpperCase()}</span>
                  <span className={`chk-st ${evento.estado}`}>{textoEstadoEvento(evento.estado)}</span>
                </div>
                <h3>{evento.nombre}</h3>
                <div className="chk-meta">
                  <span>Inicio: <b>{fechaHora(evento.fecha_inicio) || 'Sin fecha'}</b></span>
                  {evento.fecha_cierre && <span>Cierre: <b>{fechaHora(evento.fecha_cierre)}</b></span>}
                  {evento.escenario.edificios.length > 0 && (
                    <span>Edificios: <b>{evento.escenario.edificios.join(', ')}</b></span>
                  )}
                  {evento.escenario.zonas.length > 0 && <span>Zonas: <b>{evento.escenario.zonas.join(', ')}</b></span>}
                  {evento.roles_convocados.length > 0 && (
                    <span>Convocados: <b>{evento.roles_convocados.map(textoRol).join(', ')}</b></span>
                  )}
                </div>
                <span className={`chk-habilitado${evento.checkin_habilitado ? ' si' : ''}`}>
                  {evento.checkin_habilitado ? 'Check-in habilitado' : 'Check-in deshabilitado'}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!error && datos && datos.total_paginas > 1 && (
          <div className="chk-pager">
            <span>Página {datos.page + 1} de {datos.total_paginas} · {datos.total_elementos} eventos</span>
            <div>
              <button type="button" className="chk-tab" disabled={cargando || pagina === 0}
                onClick={() => { setPagina((p) => p - 1); iniciarCarga(); }}>Anterior</button>
              <button type="button" className="chk-tab" disabled={cargando || pagina + 1 >= datos.total_paginas}
                onClick={() => { setPagina((p) => p + 1); iniciarCarga(); }}>Siguiente</button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
