import { useCallback, useEffect, useState } from 'react';
import { PERMISSION } from '../../../shared/permissions';
import { errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { campusApi } from '../services/campus';
import { checkinApi } from '../services/checkin';
import type {
  CheckinResumen, Consolidado, EstadoCheckin, Pagina, Pendiente, PersonaAsistencia, RegistroHistorial,
  Resultados, TotalPorPunto, TotalesPorEstado, Ubicacion,
} from '../types';
import { ESTADOS, fechaHora, textoEstado } from '../utils/labels';
import '../styles/checkin.css';

const TAMANO_PAGINA = 20;

/** Lugar cuyo nombre no llegó de MS02: nunca se muestra su id. */
const LUGAR_SIN_NOMBRE = 'Lugar sin nombre disponible';

/** Estado del envío de la solicitud de asistencia a MS05, como lo ve el personal (RN-MS04-10). */
const ENVIO: Record<string, string> = {
  ENVIADA: 'Enviada a la brigada', PENDIENTE_ENVIO: 'Pendiente de envío', RECHAZADA: 'Rechazada',
};

type Pestana = 'personas' | 'pendientes' | 'asistencia' | 'historial' | 'resultados';

const PESTANAS: { codigo: Pestana; texto: string; historial?: boolean }[] = [
  { codigo: 'personas', texto: 'Personas' },
  { codigo: 'pendientes', texto: 'Pendientes' },
  { codigo: 'asistencia', texto: 'Requieren asistencia' },
  { codigo: 'historial', texto: 'Historial', historial: true },
  { codigo: 'resultados', texto: 'Resultados', historial: true },
];

type Carga<T> = { estado: 'cargando' } | { estado: 'listo'; datos: T } | { estado: 'error'; mensaje: string };

/** Carga con reintento: cada parte del panel falla por su cuenta, sin dejar el resto en blanco. */
function useCarga<T>(cargar: () => Promise<T>, refresco = 0) {
  const [carga, setCarga] = useState<Carga<T>>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    cargar()
      .then((datos) => { if (vigente) setCarga({ estado: 'listo', datos }); })
      .catch((err: unknown) => { if (vigente) setCarga({ estado: 'error', mensaje: errorMessage(err) }); });
    return () => { vigente = false; };
  }, [cargar, intento, refresco]);
  const reintentar = useCallback(() => { setCarga({ estado: 'cargando' }); setIntento((n) => n + 1); }, []);
  return { carga, reintentar };
}

function ErrorCarga({ mensaje, reintentar }: { mensaje: string; reintentar: () => void }) {
  return (
    <div className="chk-error">
      <p className="notice err" role="alert">{mensaje}</p>
      <button type="button" className="btn white chk-retry" onClick={reintentar}>Intentar de nuevo</button>
    </div>
  );
}

/** Persona para el usuario final: nombre y correo; si MS01 no los entregó, un texto genérico (nunca su id). */
function Persona({ nombre, correo }: { nombre: string | null; correo: string | null; id: string }) {
  if (!nombre && !correo) return <span className="chk-persona"><b>Persona sin nombre registrado</b><small>Sin datos de contacto</small></span>;
  return <span className="chk-persona"><b>{nombre ?? correo}</b>{nombre && correo && <small>{correo}</small>}</span>;
}

function EstadoPill({ estado }: { estado: EstadoCheckin }) {
  return <span className={`chk-pill ${estado}`}>{textoEstado(estado)}</span>;
}

function Paginador<T>({ pagina, unidad, cambiar }: { pagina: Pagina<T>; unidad: string; cambiar: (p: number) => void }) {
  if (pagina.total_paginas <= 1) return null;
  return (
    <div className="chk-pager">
      <span>Página {pagina.page + 1} de {pagina.total_paginas} · {pagina.total_elementos} {unidad}</span>
      <div>
        <button type="button" className="chk-tab" disabled={pagina.page === 0} onClick={() => cambiar(pagina.page - 1)}>Anterior</button>
        <button type="button" className="chk-tab" disabled={pagina.page + 1 >= pagina.total_paginas}
          onClick={() => cambiar(pagina.page + 1)}>Siguiente</button>
      </div>
    </div>
  );
}

/** Totales por estado y por punto de encuentro, usados en el consolidado y en los resultados. */
function Totales({ total, totales, porPunto, nombrePunto }: {
  total: number; totales: TotalesPorEstado; porPunto: TotalPorPunto[]; nombrePunto: (id: string | null) => string;
}) {
  return (
    <>
      <ul className="chk-totales" aria-label="Personas por estado">
        <li className="chk-total TOTAL"><b>{total}</b><span>Reportaron</span></li>
        {ESTADOS.map(({ codigo, texto }) => (
          <li key={codigo} className={`chk-total ${codigo}`}><b>{totales[codigo] ?? 0}</b><span>{texto}</span></li>
        ))}
      </ul>
      {porPunto.length > 0 && (
        <div className="chk-puntos-res">
          <small>A salvo por punto de encuentro</small>
          <ul aria-label="A salvo por punto de encuentro">
            {porPunto.map((p) => <li key={p.punto_encuentro_id}>{nombrePunto(p.punto_encuentro_id)} <b>{p.total}</b></li>)}
          </ul>
        </div>
      )}
    </>
  );
}

/**
 * Seguimiento de las personas de un evento (RF-MS04-06 a RF-MS04-12): consolidado y pestañas de personas, pendientes,
 * asistencia y, con ms04:history:read, historial y resultados. Lo usan el panel de MS04 y «Ver en vivo» de Eventos
 * (MS06), así no se duplica la pantalla. Cada persona se muestra con su nombre y su correo de MS01; los lugares, con su
 * nombre de MS02 (nunca con su id). `refresco` vuelve a consultar todo sin dejar la vista en blanco.
 */
export default function SeguimientoEvento({ session, eventoId, refresco = 0 }: { session: Session; eventoId: string; refresco?: number }) {
  const verHistorial = hasPermission(session, PERMISSION.MS04_HISTORY_READ);
  const pestanas = PESTANAS.filter((p) => !p.historial || verHistorial);
  const [pestana, setPestana] = useState<Pestana>('personas');
  const [puntos, setPuntos] = useState<Record<string, string>>({});
  const [edificios, setEdificios] = useState<Record<string, string>>({});

  // Nombres de MS02 para mostrar los lugares; si fallan, se muestra un texto genérico
  useEffect(() => {
    let vigente = true;
    campusApi.puntosEncuentro(session)
      .then((l) => { if (vigente) setPuntos(Object.fromEntries(l.map((p) => [p.id, p.nombre]))); })
      .catch(() => { /* sin nombres */ });
    campusApi.edificios(session)
      .then((l) => { if (vigente) setEdificios(Object.fromEntries(l.map((e) => [e.id, e.nombre]))); })
      .catch(() => { /* sin nombres */ });
    return () => { vigente = false; };
  }, [session]);

  const nombrePunto = (id: string | null) => (id ? puntos[id] ?? LUGAR_SIN_NOMBRE : '—');
  const lugar = (u: Ubicacion | null) => {
    if (!u) return '—';
    if (u.tipo === 'EDIFICIO') return edificios[u.id] ?? LUGAR_SIN_NOMBRE;
    if (u.tipo === 'PUNTO_ENCUENTRO') return puntos[u.id] ?? LUGAR_SIN_NOMBRE;
    return LUGAR_SIN_NOMBRE;
  };

  const cargarConsolidado = useCallback(() => checkinApi.consolidado(session, eventoId), [session, eventoId]);
  const consolidado = useCarga<Consolidado>(cargarConsolidado, refresco);

  return (
    <>
      <section className="chk-tarjeta" aria-labelledby="chk-consolidado-titulo">
        <div className="chk-tarjeta-cab">
          <div>
            <h2 id="chk-consolidado-titulo" className="title sm22">Consolidado</h2>
            {consolidado.carga.estado === 'listo' && (
              <p className="chk-sub">Calculado: {fechaHora(consolidado.carga.datos.calculado_en)}</p>
            )}
          </div>
          <button type="button" className="btn white chk-actualizar" onClick={consolidado.reintentar}>Actualizar</button>
        </div>
        {consolidado.carga.estado === 'cargando' && <p className="notice" role="status">Consultando el consolidado…</p>}
        {consolidado.carga.estado === 'error' && (
          <ErrorCarga mensaje={consolidado.carga.mensaje} reintentar={consolidado.reintentar} />
        )}
        {consolidado.carga.estado === 'listo' && (
          <Totales total={consolidado.carga.datos.total_reportados} totales={consolidado.carga.datos.totales_por_estado}
            porPunto={consolidado.carga.datos.por_punto_encuentro} nombrePunto={nombrePunto} />
        )}
      </section>

      <section className="chk-tarjeta" aria-label="Detalle del evento">
        <div className="chk-segmentos" role="tablist" aria-label="Detalle del evento">
          {pestanas.map((p) => (
            <button key={p.codigo} type="button" role="tab" className="chk-segmento" aria-selected={pestana === p.codigo}
              onClick={() => setPestana(p.codigo)}>
              {p.texto}
            </button>
          ))}
        </div>
        {pestana === 'personas' && <Personas session={session} eventoId={eventoId} refresco={refresco} nombrePunto={nombrePunto} />}
        {pestana === 'pendientes' && <Pendientes session={session} eventoId={eventoId} refresco={refresco} />}
        {pestana === 'asistencia' && <Asistencia session={session} eventoId={eventoId} refresco={refresco} lugar={lugar} />}
        {pestana === 'historial' && verHistorial && (
          <Historial session={session} eventoId={eventoId} refresco={refresco} nombrePunto={nombrePunto} lugar={lugar} />
        )}
        {pestana === 'resultados' && verHistorial && <ResultadosEvento session={session} eventoId={eventoId} refresco={refresco} nombrePunto={nombrePunto} />}
      </section>
    </>
  );
}

interface Base { session: Session; eventoId: string; refresco: number }

function FiltroEstado({ estado, cambiar }: { estado: EstadoCheckin | ''; cambiar: (e: EstadoCheckin | '') => void }) {
  return (
    <div className="chk-tabs" role="group" aria-label="Filtrar por estado">
      {[{ codigo: '' as const, texto: 'Todos' }, ...ESTADOS].map((e) => (
        <button key={e.codigo || 'todos'} type="button" className="chk-tab" aria-pressed={estado === e.codigo}
          onClick={() => cambiar(e.codigo)}>{e.texto}</button>
      ))}
    </div>
  );
}

function Personas({ session, eventoId, refresco, nombrePunto }: Base & { nombrePunto: (id: string | null) => string }) {
  const [estado, setEstado] = useState<EstadoCheckin | ''>('');
  const [page, setPage] = useState(0);
  const cargar = useCallback(() => checkinApi.personas(session, eventoId, { estado: estado || undefined, page, size: TAMANO_PAGINA }),
    [session, eventoId, estado, page]);
  const { carga, reintentar } = useCarga<Pagina<CheckinResumen>>(cargar, refresco);
  return (
    <div className="chk-seccion">
      <FiltroEstado estado={estado} cambiar={(e) => { setEstado(e); setPage(0); }} />
      {carga.estado === 'cargando' && <p className="notice" role="status">Consultando las personas…</p>}
      {carga.estado === 'error' && <ErrorCarga mensaje={carga.mensaje} reintentar={reintentar} />}
      {carga.estado === 'listo' && carga.datos.contenido.length === 0 && <div className="chk-vacio" role="status">Nadie ha reportado con ese estado.</div>}
      {carga.estado === 'listo' && carga.datos.contenido.length > 0 && (
        <>
          <div className="chk-tablawrap">
            <table className="chk-tabla">
              <thead><tr><th>Persona</th><th>Estado</th><th>Punto de encuentro</th><th>Reportado</th></tr></thead>
              <tbody>
                {carga.datos.contenido.map((c) => (
                  <tr key={c.usuario_id}>
                    <td><Persona nombre={c.nombre} correo={c.correo} id={c.usuario_id} /></td>
                    <td><EstadoPill estado={c.estado} /></td>
                    <td>{c.estado === 'SAFE' ? nombrePunto(c.punto_encuentro_id) : '—'}</td>
                    <td>{fechaHora(c.fecha_hora)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador pagina={carga.datos} unidad="personas" cambiar={setPage} />
        </>
      )}
    </div>
  );
}

function Pendientes({ session, eventoId, refresco }: Base) {
  const [page, setPage] = useState(0);
  const cargar = useCallback(() => checkinApi.pendientes(session, eventoId, { page, size: TAMANO_PAGINA }), [session, eventoId, page]);
  const { carga, reintentar } = useCarga<Pagina<Pendiente>>(cargar, refresco);
  return (
    <div className="chk-seccion">
      <p className="chk-sub">Personas convocadas que todavía no han reportado su estado.</p>
      {carga.estado === 'cargando' && <p className="notice" role="status">Consultando las personas pendientes…</p>}
      {carga.estado === 'error' && <ErrorCarga mensaje={carga.mensaje} reintentar={reintentar} />}
      {carga.estado === 'listo' && carga.datos.contenido.length === 0 && <div className="chk-vacio" role="status">Todas las personas convocadas han reportado.</div>}
      {carga.estado === 'listo' && carga.datos.contenido.length > 0 && (
        <>
          <div className="chk-tablawrap">
            <table className="chk-tabla">
              <thead><tr><th>Persona</th></tr></thead>
              <tbody>
                {carga.datos.contenido.map((p) => (
                  <tr key={p.usuario_id}><td><Persona nombre={p.nombre} correo={p.correo} id={p.usuario_id} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador pagina={carga.datos} unidad="pendientes" cambiar={setPage} />
        </>
      )}
    </div>
  );
}

function Asistencia({ session, eventoId, refresco, lugar }: Base & { lugar: (u: Ubicacion | null) => string }) {
  const [page, setPage] = useState(0);
  const cargar = useCallback(() => checkinApi.asistencia(session, eventoId, { page, size: TAMANO_PAGINA }), [session, eventoId, page]);
  const { carga, reintentar } = useCarga<Pagina<PersonaAsistencia>>(cargar, refresco);
  return (
    <div className="chk-seccion">
      <p className="chk-sub">La atención de las solicitudes la gestionan la coordinación y la brigada en la sección de incidentes.</p>
      {carga.estado === 'cargando' && <p className="notice" role="status">Consultando quién requiere asistencia…</p>}
      {carga.estado === 'error' && <ErrorCarga mensaje={carga.mensaje} reintentar={reintentar} />}
      {carga.estado === 'listo' && carga.datos.contenido.length === 0 && <div className="chk-vacio" role="status">Nadie requiere asistencia en este momento.</div>}
      {carga.estado === 'listo' && carga.datos.contenido.length > 0 && (
        <>
          <div className="chk-tablawrap">
            <table className="chk-tabla">
              <thead><tr><th>Persona</th><th>Lugar</th><th>Reportado</th><th>Solicitud</th></tr></thead>
              <tbody>
                {carga.datos.contenido.map((a) => (
                  <tr key={a.usuario_id}>
                    <td><Persona nombre={a.nombre} correo={a.correo} id={a.usuario_id} /></td>
                    <td>{lugar(a.ubicacion)}</td>
                    <td>{fechaHora(a.fecha_reporte)}</td>
                    <td><span className={`chk-envio ${a.solicitud_asistencia.estado_envio}`}>
                      {ENVIO[a.solicitud_asistencia.estado_envio] ?? a.solicitud_asistencia.estado_envio}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador pagina={carga.datos} unidad="personas" cambiar={setPage} />
        </>
      )}
    </div>
  );
}

function Historial({ session, eventoId, refresco, nombrePunto, lugar }: Base & {
  nombrePunto: (id: string | null) => string; lugar: (u: Ubicacion | null) => string;
}) {
  const [estado, setEstado] = useState<EstadoCheckin | ''>('');
  const [page, setPage] = useState(0);
  const cargar = useCallback(() => checkinApi.historial(session, eventoId, { estado: estado || undefined, page, size: TAMANO_PAGINA }),
    [session, eventoId, estado, page]);
  const { carga, reintentar } = useCarga<Pagina<RegistroHistorial>>(cargar, refresco);
  return (
    <div className="chk-seccion">
      <FiltroEstado estado={estado} cambiar={(e) => { setEstado(e); setPage(0); }} />
      {carga.estado === 'cargando' && <p className="notice" role="status">Consultando el historial…</p>}
      {carga.estado === 'error' && <ErrorCarga mensaje={carga.mensaje} reintentar={reintentar} />}
      {carga.estado === 'listo' && carga.datos.contenido.length === 0 && <div className="chk-vacio" role="status">No hay cambios de estado registrados.</div>}
      {carga.estado === 'listo' && carga.datos.contenido.length > 0 && (
        <>
          <div className="chk-tablawrap">
            <table className="chk-tabla">
              <thead><tr><th>Fecha</th><th>Persona</th><th>Estado</th><th>Lugar</th></tr></thead>
              <tbody>
                {carga.datos.contenido.map((h) => (
                  <tr key={h.checkin_id}>
                    <td>{fechaHora(h.registrado_en)}</td>
                    <td><Persona nombre={h.nombre} correo={h.correo} id={h.usuario_id} /></td>
                    <td><EstadoPill estado={h.estado} /></td>
                    <td>{h.estado === 'SAFE' ? nombrePunto(h.punto_encuentro_id) : lugar(h.ubicacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginador pagina={carga.datos} unidad="registros" cambiar={setPage} />
        </>
      )}
    </div>
  );
}

function ResultadosEvento({ session, eventoId, refresco, nombrePunto }: Base & { nombrePunto: (id: string | null) => string }) {
  const cargar = useCallback(() => checkinApi.resultados(session, eventoId), [session, eventoId]);
  const { carga, reintentar } = useCarga<Resultados>(cargar, refresco);
  if (carga.estado === 'cargando') return <p className="notice" role="status">Consultando los resultados…</p>;
  if (carga.estado === 'error') return <ErrorCarga mensaje={carga.mensaje} reintentar={reintentar} />;
  const r = carga.datos;
  return (
    <div className="chk-seccion">
      {!r.finales && <p className="notice" role="status">Resultados parciales: el evento aún no ha finalizado.</p>}
      <ul className="chk-resumen" aria-label="Resumen del evento">
        <li><small>Personas convocadas</small><b>{r.poblacion_objetivo ?? 'No disponible'}</b></li>
        <li><small>Sin reportar</small><b>{r.total_pendientes ?? 'No disponible'}</b></li>
        <li><small>Solicitudes de asistencia</small><b>{r.solicitudes_asistencia.length}</b></li>
        {r.fecha_cierre && <li><small>Cierre</small><b>{fechaHora(r.fecha_cierre)}</b></li>}
      </ul>
      <Totales total={r.total_reportados} totales={r.totales_por_estado} porPunto={r.por_punto_encuentro} nombrePunto={nombrePunto} />
    </div>
  );
}
