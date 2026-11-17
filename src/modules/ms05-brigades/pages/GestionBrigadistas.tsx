import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from '../../../shared/components/Icons';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import IncidentesEvento from '../components/IncidentesEvento';
import { brigadesApi } from '../services/brigades';
import type { BrigadistaGestion, EventoOperacion, GestionBrigadistasEvento } from '../types';
import '../../ms06-drills/styles/events.css';
import '../styles/brigadas.css';

type Filtro = 'TODOS' | 'ACTIVO' | 'INACTIVO';

const ESTADO_EVENTO: Record<string, string> = { PROGRAMADO: 'Programado', EN_EJECUCION: 'En ejecución' };
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const Chevron = () => (
  <svg className="bg-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/**
 * RF-BEI-01 (opción 1) y RF-BEI-02: panel del coordinador para gestionar a los brigadistas de un evento.
 * Lista primero a los activos, agrupados por edificio en orden alfabético, y después a los inactivos. Cada brigadista
 * se despliega para ver sus incidentes en atención y resueltos y, en eventos reales, cambiar su edificio.
 */
export default function GestionBrigadistas({ session }: { session: Session }) {
  const [eventos, setEventos] = useState<EventoOperacion[] | null>(null);
  const [eventoId, setEventoId] = useState('');
  const [panel, setPanel] = useState<GestionBrigadistasEvento | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [abierto, setAbierto] = useState('');
  const [cambio, setCambio] = useState<BrigadistaGestion | null>(null);

  // Eventos programados o en ejecución registrados en MS05
  useEffect(() => {
    brigadesApi.eventosOperacion(session)
      .then((lista) => {
        setEventos(lista);
        // Por defecto, el evento real en ejecución; si no hay, el primero
        const preferido = lista.find((e) => e.estado === 'EN_EJECUCION' && !e.simulacro)
          ?? lista.find((e) => e.estado === 'EN_EJECUCION')
          ?? lista[0];
        if (preferido) setEventoId(preferido.eventoId);
      })
      .catch((err) => { setEventos([]); setError(errorMessage(err)); });
  }, [session]);

  const cargar = useCallback(async () => {
    if (!eventoId) return;
    setLoading(true);
    setError('');
    try {
      setPanel(await brigadesApi.gestionEvento(session, eventoId));
    } catch (err) {
      setPanel(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [session, eventoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    if (!panel) return [];
    const q = norm(texto.trim());
    return panel.brigadistas
      .filter((b) => filtro === 'TODOS' || b.estado === filtro)
      .filter((b) => !q || norm(b.nombre).includes(q));
  }, [panel, texto, filtro]);

  // Agrupa en el orden que entrega MS05: activos por edificio, activos sin edificio e inactivos
  const grupos = useMemo(() => {
    const out: { titulo: string; items: BrigadistaGestion[] }[] = [];
    for (const b of visibles) {
      const titulo = b.estado !== 'ACTIVO' ? 'Inactivos' : b.nombreUbicacion ?? 'Activos sin edificio';
      const last = out[out.length - 1];
      if (last && last.titulo === titulo) last.items.push(b);
      else out.push({ titulo, items: [b] });
    }
    return out;
  }, [visibles]);

  const evento = panel?.evento;

  // Misma regla que MS05 y MS06: el coordinador gestiona eventos reales y el organizador simulacros
  const roles = session.user.roles;
  const coordina = roles.includes('COORDINADOR');
  const organiza = roles.includes('ORGANIZADOR');
  const tipos = coordina && organiza ? 'eventos ni simulacros' : organiza ? 'simulacros' : 'eventos reales';

  return (
    <>
      <header className="ev-head">
        <div>
          <h1>Gestión de brigadistas</h1>
          <p>
            {coordina && organiza ? 'Eventos reales y simulacros' : organiza ? 'Simulacros' : 'Eventos reales'}: primero los brigadistas activos, por edificio; después los inactivos.
            {' '}Despliega a cada uno para ver sus incidentes y cambiar su edificio.
          </p>
        </div>
      </header>
      <main className="ev-main">
        {eventos === null && <p className="notice" role="status">Cargando eventos…</p>}
        {eventos && eventos.length === 0 && !error && (
          <div className="ev-empty">No hay {tipos} programados ni en ejecución. Cuando se programe uno, aquí podrás gestionar a sus brigadistas.</div>
        )}

        {eventos && eventos.length > 1 && (
          <div className="ev-tabs" role="group" aria-label="Evento">
            {eventos.map((e) => (
              <button key={e.eventoId} type="button" className="ev-tab" aria-pressed={e.eventoId === eventoId}
                onClick={() => { setEventoId(e.eventoId); setAbierto(''); setMessage(''); }}>
                {e.nombre}{e.simulacro ? ' · Simulacro' : ''}
              </button>
            ))}
          </div>
        )}

        {evento && (
          <section className="ev-card">
            <div>
              <span className={`st ${evento.estado === 'EN_EJECUCION' ? 'IN_PROGRESS' : 'SCHEDULED'}`}>{ESTADO_EVENTO[evento.estado] ?? evento.estado}</span>
              <h2 style={{ marginTop: 8 }}>{evento.nombre}</h2>
              <span className="help">{evento.simulacro ? 'Simulacro' : 'Evento real'} · {evento.edificios.length} edificio(s) en el evento</span>
            </div>
            {!evento.permiteReasignar && (
              <p className="ev-info">Este evento ya no admite cambios de asignación.</p>
            )}
          </section>
        )}

        {panel && (
          <div className="bg-tools">
            <form className="searchbar" role="search" onSubmit={(e) => e.preventDefault()}>
              <input aria-label="Buscar por nombre o apellido" placeholder="Buscar por nombre o apellido" value={texto} onChange={(e) => setTexto(e.target.value)} />
              <button type="submit" aria-label="Buscar"><Search /></button>
            </form>
            <div className="ev-tabs" role="group" aria-label="Filtrar por estado">
              <button type="button" className="ev-tab" aria-pressed={filtro === 'ACTIVO'} onClick={() => setFiltro(filtro === 'ACTIVO' ? 'TODOS' : 'ACTIVO')}>Activos</button>
              <button type="button" className="ev-tab" aria-pressed={filtro === 'INACTIVO'} onClick={() => setFiltro(filtro === 'INACTIVO' ? 'TODOS' : 'INACTIVO')}>Inactivos</button>
            </div>
          </div>
        )}

        {error && <p className="notice err" role="alert">{error} {eventoId && <button type="button" className="plink" onClick={cargar}>Reintentar</button>}</p>}
        {message && <p className="notice" role="status">{message}</p>}
        {loading && <p className="notice" role="status">Cargando brigadistas…</p>}

        {panel && !loading && visibles.length === 0 && (
          <div className="ev-empty">{panel.brigadistas.length === 0 ? 'No hay brigadistas registrados.' : 'No hay brigadistas que coincidan con la búsqueda.'}</div>
        )}

        {panel && !loading && grupos.map((g) => (
          <section key={g.titulo} className="bg-list" aria-label={g.titulo}>
            <h3 className="bg-group">{g.titulo}</h3>
            {g.items.map((b) => {
              const open = abierto === b.brigadistaId;
              const activo = b.estado === 'ACTIVO';
              return (
                <article key={b.brigadistaId} className={`bg-item${open ? ' open' : ''}`}>
                  <button type="button" className="bg-row" aria-expanded={open} aria-controls={`bg-${b.brigadistaId}`}
                    onClick={() => setAbierto(open ? '' : b.brigadistaId)}>
                    <span className="bg-name">{b.nombre}</span>
                    <span className={`bg-zone${b.nombreUbicacion ? '' : ' none'}`}>{b.nombreUbicacion ?? 'Sin edificio'}</span>
                    <span className={`st ${activo ? 'FINISHED' : 'DRAFT'}`}>{activo ? 'Activo' : 'Inactivo'}</span>
                    <Chevron />
                  </button>
                  {open && (
                    <div className="bg-body" id={`bg-${b.brigadistaId}`}>
                      <div className="bg-stats">
                        <span>Incidentes en atención <b className={b.incidentesEnAtencion > 0 ? 'hot' : ''}>{b.incidentesEnAtencion}</b></span>
                        <span>Incidentes resueltos <b>{b.incidentesResueltos}</b></span>
                        {b.incidentesEnAtencion > 0 && <span className="help">Está atendiendo un incidente en este momento.</span>}
                      </div>
                      {evento?.permiteReasignar && activo && (
                        <button type="button" className="btn red" onClick={() => setCambio(b)}>Cambiar asignación</button>
                      )}
                      {evento?.permiteReasignar && !activo && <span className="help">El brigadista debe estar activo para asignarle un edificio.</span>}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ))}

        {evento?.estado === 'EN_EJECUCION' && (
          <section className="ev-card">
            <h2>Incidentes · {evento.nombre}</h2>
            <p className="help">Todos los incidentes reportados en el evento en ejecución, con su estado y si ya tienen un brigadista responsable.</p>
            <IncidentesEvento session={session} eventoId={evento.eventoId} modo="monitoreo" />
          </section>
        )}
      </main>

      {cambio && evento && (
        <CambiarAsignacion
          session={session}
          evento={evento}
          brigadista={cambio}
          onClose={() => setCambio(null)}
          onDone={async (nombreEdificio) => {
            const nombre = cambio.nombre;
            setCambio(null);
            await cargar();
            setMessage(`${nombre} quedó asignado a ${nombreEdificio}.`);
          }}
        />
      )}
    </>
  );
}

/** Ventana con los edificios del evento para cambiar el edificio de un brigadista. */
function CambiarAsignacion({ session, evento, brigadista, onClose, onDone }: {
  session: Session;
  evento: EventoOperacion;
  brigadista: BrigadistaGestion;
  onClose: () => void;
  onDone: (nombreEdificio: string) => void;
}) {
  const [seleccion, setSeleccion] = useState(brigadista.ubicacionId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const aceptar = async () => {
    const edificio = evento.edificios.find((e) => e.ubicacionId === seleccion);
    if (!edificio) { setError('Elige un edificio.'); return; }
    if (edificio.ubicacionId === brigadista.ubicacionId) { setError('El brigadista ya está en ese edificio.'); return; }
    setSaving(true);
    setError('');
    try {
      await brigadesApi.cambiarEdificio(session, evento.eventoId, brigadista.brigadistaId, edificio.ubicacionId);
      onDone(edificio.nombre);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="ev-modal-bg" role="presentation" onClick={onClose}>
      <div className="ev-modal" role="dialog" aria-modal="true" aria-labelledby="cambio-titulo" onClick={(e) => e.stopPropagation()}>
        <h2 id="cambio-titulo">Cambiar asignación</h2>
        <p className="help">{brigadista.nombre} · actualmente en <b>{brigadista.nombreUbicacion ?? 'ningún edificio'}</b>. Un edificio no puede quedar sin brigadistas.</p>
        {evento.edificios.length === 0 && <p className="notice err">El evento no tiene edificios registrados.</p>}
        <div className="bg-opts" role="radiogroup" aria-label="Edificios del evento">
          {evento.edificios.map((e) => (
            <label key={e.ubicacionId} className="bg-opt">
              <span><input type="radio" name="edificio" value={e.ubicacionId} checked={seleccion === e.ubicacionId} onChange={() => setSeleccion(e.ubicacionId)} />{e.nombre}</span>
              <small>{e.brigadistasAsignados === 1 ? '1 brigadista' : `${e.brigadistasAsignados} brigadistas`}</small>
            </label>
          ))}
        </div>
        {error && <p className="notice err" role="alert">{error}</p>}
        <div className="row2">
          <button type="button" className="btn white" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="btn red" onClick={aceptar} disabled={saving || !seleccion}>{saving ? 'Guardando…' : 'Aceptar'}</button>
        </div>
      </div>
    </div>
  );
}
