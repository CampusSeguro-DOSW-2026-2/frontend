import { useEffect, useState } from 'react';
import { Cargando } from '../../../shared/components/Cargando';
import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { Mensaje } from '../../../shared/components/Mensaje';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { checkinApi } from '../services/checkin';
import type { EstadoEvento, EventoPage } from '../types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { ESTADOS_EVENTO, fechaHora, textoEscenario, textoEstadoEvento, textoRol, tipoEvento } from '../utils/labels';
import '../styles/checkin.css';

/** Mensaje de la lista cuando no hay eventos, o ninguno con el estado elegido (F-07). */
export const SIN_EVENTOS = 'No hay eventos.';

const TAMANO_PAGINA = 20;

/** Clase del estado con los colores del estándar de listados (.st): en ejecución se resalta en ámbar. */
const CLASE_ESTADO: Partial<Record<EstadoEvento, string>> = {
  BORRADOR: 'DRAFT', PROGRAMADO: 'SCHEDULED', EN_EJECUCION: 'IN_PROGRESS', FINALIZADO: 'FINISHED',
};

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
  // Nombres de MS02 para los eventos guardados con ids; si MS02 no responde, se muestra el texto de MS04
  const { catalog } = useScopeCatalog();
  const [intento, setIntento] = useState(0);
  const [busqueda, setBusqueda] = useState('');

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

  const todos = datos?.contenido ?? [];
  // MS04 no filtra por nombre: la búsqueda se hace sobre los eventos de la página cargada y la pantalla lo dice
  const termino = busqueda.trim().toLowerCase();
  const eventos = termino ? todos.filter((e) => e.nombre.toLowerCase().includes(termino)) : todos;
  const variasPaginas = !!datos && datos.total_paginas > 1;

  return (
    <>
      <header className="ev-head">
        <div>
          <h1>Eventos de evacuación</h1>
          <p>Simulacros y emergencias en cualquier estado. Abra el panel para seguir el estado de las personas.</p>
        </div>
      </header>
      <main className="ev-main">
        <div className="ev-tools">
          <div className="ev-tabs" role="group" aria-label="Filtrar por estado">
            {ESTADOS_EVENTO.map((e) => (
              <button key={e.codigo || 'todos'} type="button" className="ev-tab" aria-pressed={estado === e.codigo}
                onClick={() => { setEstado(e.codigo); setPagina(0); iniciarCarga(); }}>
                {e.texto}
              </button>
            ))}
          </div>
          <div className="searchbar" role="search">
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder={variasPaginas ? 'Buscar en esta página' : 'Buscar por nombre'} aria-label="Buscar evento por nombre" />
          </div>
        </div>
        {termino && variasPaginas && (
          <p className="help">La búsqueda cubre los {todos.length} eventos de esta página. Cambie de página para buscar en los demás.</p>
        )}

        {error && <Mensaje tono="error" onReintentar={() => { setIntento((n) => n + 1); iniciarCarga(); }}>{error}</Mensaje>}
        {cargando && !datos && !error && <Cargando texto="Consultando los eventos…" />}

        {datos && !error && eventos.length === 0 && (
          <EstadoVacio titulo={termino ? 'Ningún evento coincide con la búsqueda' : SIN_EVENTOS}>
            {termino ? 'Revise el nombre o borre la búsqueda.' : estado ? 'Pruebe con otro estado o con «Todos».' : 'Cuando se cree un simulacro o una emergencia, aparecerá aquí.'}
          </EstadoVacio>
        )}

        {!error && eventos.length > 0 && (
          <div className="actualizando" aria-busy={cargando}>
            <table className="ev-table">
              <thead>
                <tr><th>Evento</th><th>Estado</th><th>Inicio</th><th>Check-in</th><th><span className="sr-only">Acciones</span></th></tr>
              </thead>
              <tbody>
                {eventos.map((evento) => (
                  <tr key={evento.evento_id} className={evento.estado === 'EN_EJECUCION' ? 'live' : undefined}>
                    <td>
                      <div className="t">{evento.nombre}</div>
                      <div className="s">
                        {[
                          tipoEvento(evento.simulacro),
                          evento.escenario.edificios.length > 0 ? textoEscenario(evento.escenario.edificios, catalog) : '',
                          evento.escenario.zonas.length > 0 ? textoEscenario(evento.escenario.zonas, catalog) : '',
                          evento.roles_convocados.length > 0 ? `Convocados: ${evento.roles_convocados.map(textoRol).join(', ')}` : '',
                        ].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td><span className={`st ${CLASE_ESTADO[evento.estado] ?? ''}`}>{textoEstadoEvento(evento.estado)}</span></td>
                    <td>
                      {fechaHora(evento.fecha_inicio) || 'Sin fecha'}
                      {evento.fecha_cierre && <div className="s">Cierre: {fechaHora(evento.fecha_cierre)}</div>}
                    </td>
                    <td>{evento.checkin_habilitado ? 'Habilitado' : 'Deshabilitado'}</td>
                    <td>
                      <div className="ev-acts">
                        <a className="btn white sm" href={`#/evacuacion/eventos/${encodeURIComponent(evento.evento_id)}`}>
                          Abrir panel
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && datos && variasPaginas && (
          <div className="ev-pager">
            <span>Página {datos.page + 1} de {datos.total_paginas} · {datos.total_elementos} eventos</span>
            <div>
              <button type="button" className="ev-tab" disabled={cargando || pagina === 0}
                onClick={() => { setPagina((p) => p - 1); setBusqueda(''); iniciarCarga(); }}>Anterior</button>
              <button type="button" className="ev-tab" disabled={cargando || pagina + 1 >= datos.total_paginas}
                onClick={() => { setPagina((p) => p + 1); setBusqueda(''); iniciarCarga(); }}>Siguiente</button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
