import { useEffect, useMemo, useState } from 'react';
import { Search } from '../../../shared/components/Icons';
import { ApiError, errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventSummary } from '../../ms06-drills/types';
import { SCOPE_OPTIONS, scopeLabel } from '../../ms06-drills/utils/labels';
import IncidentesEvento from '../components/IncidentesEvento';
import { brigadesApi, tipoDesdeAlcance } from '../services/brigades';
import type { BrigadistaEncontrado } from '../types';
import '../../ms06-drills/styles/events.css';

type FiltroEstado = '' | 'ACTIVO' | 'INACTIVO';
type FiltroZona = '' | 'con' | 'sin';

const ordenar = (lista: BrigadistaEncontrado[]) => [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const vigentes = (b: BrigadistaEncontrado) => b.asignaciones.filter((a) => a.estado === 'VIGENTE');

/**
 * RF-BEI-01 (opción 1) y RF-BEI-02: el coordinador o el organizador ve todos los brigadistas (activos o no,
 * con zona o sin ella), los filtra, reasigna o retira su zona y asigna responsables a las solicitudes de
 * atención del evento en ejecución.
 */
export default function GestionBrigadistas({ session }: { session: Session }) {
  const [brigadistas, setBrigadistas] = useState<BrigadistaEncontrado[] | null>(null);
  // MS05 todavía no permite listar sin nombre: en ese caso la lista se arma con cada búsqueda
  const [soloBusqueda, setSoloBusqueda] = useState(false);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<FiltroEstado>('');
  const [zona, setZona] = useState<FiltroZona>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [enEjecucion, setEnEjecucion] = useState<EventSummary[]>([]);
  // Cambia para volver a pedir la lista (después de reasignar o retirar)
  const [version, setVersion] = useState(0);

  useEffect(() => {
    eventsApi.active(session).then(setEnEjecucion).catch(() => setEnEjecucion([]));
  }, [session]);

  useEffect(() => {
    if (soloBusqueda) return;
    let ignore = false;
    brigadesApi.listar(session)
      .then((res) => { if (!ignore) { setBrigadistas(ordenar(res.resultados)); setError(''); } })
      .catch((err) => {
        if (ignore) return;
        if (err instanceof ApiError && err.status === 400) {
          setSoloBusqueda(true);
          setBrigadistas(null);
        } else {
          setError(errorMessage(err));
        }
      });
    return () => { ignore = true; };
  }, [session, soloBusqueda, version]);

  const buscar = async () => {
    setMessage('');
    if (!soloBusqueda) return; // con la lista completa, el texto filtra en la pantalla
    if (!texto.trim()) { setError('Escriba un nombre o apellido.'); return; }
    setError('');
    try {
      const res = await brigadesApi.buscar(session, texto.trim());
      setBrigadistas(ordenar(res.resultados));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const recargar = async () => {
    if (soloBusqueda) await buscar();
    else setVersion((v) => v + 1);
  };

  const reasignar = async (idAsignacion: string, ubicacionId: string) => {
    const destino = SCOPE_OPTIONS.find((o) => o.id === ubicacionId);
    if (!destino) return;
    setBusy(idAsignacion);
    try {
      await brigadesApi.reasignar(session, idAsignacion, destino.id, tipoDesdeAlcance(destino.type));
      await recargar();
      setMessage('Zona actualizada.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const retirar = async (idAsignacion: string) => {
    if (!window.confirm('¿Retirar esta asignación? El brigadista quedará sin zona en el evento.')) return;
    setBusy(idAsignacion);
    try {
      await brigadesApi.retirar(session, idAsignacion);
      await recargar();
      setMessage('Asignación retirada.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const filtrados = useMemo(() => (brigadistas ?? []).filter((b) => {
    if (!soloBusqueda && texto.trim() && !normalizar(b.nombre).includes(normalizar(texto))) return false;
    if (estado && b.estado !== estado) return false;
    if (zona === 'con' && vigentes(b).length === 0) return false;
    if (zona === 'sin' && vigentes(b).length > 0) return false;
    return true;
  }), [brigadistas, soloBusqueda, texto, estado, zona]);

  // Para asignar responsables solo se ofrecen brigadistas activos, con sus zonas vigentes
  const activos = useMemo(
    () => (brigadistas ?? []).filter((b) => b.estado === 'ACTIVO').map((b) => ({
      id: b.idBrigadista,
      nombre: b.nombre,
      zonas: vigentes(b).map((a) => ({ eventoId: a.eventoId, ubicacionId: a.ubicacionId })),
    })),
    [brigadistas],
  );

  const total = brigadistas?.length ?? 0;
  const selectStyle = { font: 'inherit', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' };

  return (
    <>
      <header className="ev-head">
        <div>
          <h1>Gestión de brigadistas</h1>
          <p>Consulte todos los brigadistas, reasigne su zona según la necesidad y asigne responsables a las solicitudes de atención.</p>
        </div>
      </header>
      <main className="ev-main">
        <form className="searchbar" role="search" onSubmit={(e) => { e.preventDefault(); buscar(); }}>
          <input aria-label="Buscar por nombre o apellido" placeholder="Buscar por nombre o apellido" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button type="submit" aria-label="Buscar"><Search /></button>
        </form>
        <div className="ev-acts" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 10, margin: '10px 0' }}>
          <select aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value as FiltroEstado)} style={selectStyle}>
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
          <select aria-label="Filtrar por zona" value={zona} onChange={(e) => setZona(e.target.value as FiltroZona)} style={selectStyle}>
            <option value="">Con y sin zona</option>
            <option value="con">Con zona asignada</option>
            <option value="sin">Sin zona asignada</option>
          </select>
          {brigadistas && <span className="help">{filtrados.length} de {total} brigadistas</span>}
        </div>
        {soloBusqueda && brigadistas === null && (
          <p className="notice" role="status">Busque por nombre o apellido para ver los brigadistas.</p>
        )}
        {error && <p className="notice err" role="alert">{error}</p>}
        {message && <p className="notice" role="status">{message}</p>}
        {!soloBusqueda && brigadistas === null && !error && <p className="notice" role="status">Cargando brigadistas…</p>}
        {brigadistas && filtrados.length === 0 && <div className="ev-empty">No hay brigadistas con esos criterios.</div>}
        {filtrados.length > 0 && (
          <table className="ev-table">
            <thead><tr><th>Brigadista</th><th>Estado</th><th>Zona en el evento</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {filtrados.flatMap((b) => {
                const asignadas = vigentes(b);
                const badge = <span className={`st ${b.estado === 'ACTIVO' ? 'FINISHED' : 'DRAFT'}`}>{b.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span>;
                if (asignadas.length === 0) {
                  return [<tr key={b.idBrigadista}><td><div className="t">{b.nombre}</div></td><td>{badge}</td><td className="help">Sin zona</td><td /></tr>];
                }
                return asignadas.map((a) => (
                  <tr key={a.idAsignacion}>
                    <td><div className="t">{b.nombre}</div><div className="s">Evento {a.eventoId.slice(0, 8)}</div></td>
                    <td>{badge}</td>
                    <td>
                      <select aria-label={`Zona de ${b.nombre}`} value={a.ubicacionId} disabled={busy === a.idAsignacion}
                        onChange={(e) => reasignar(a.idAsignacion, e.target.value)} style={selectStyle}>
                        {!SCOPE_OPTIONS.some((o) => o.id === a.ubicacionId) && <option value={a.ubicacionId}>{scopeLabel(a.ubicacionId)}</option>}
                        {SCOPE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{scopeLabel(o.id)}</option>)}
                      </select>
                    </td>
                    <td><div className="ev-acts"><button type="button" className="btn white" disabled={busy === a.idAsignacion} onClick={() => retirar(a.idAsignacion)}>Retirar</button></div></td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        )}
        <p className="help">Un brigadista tiene una sola zona a la vez. Solo el coordinador o el organizador reasigna; el cambio queda en auditoría.</p>

        {enEjecucion.map((ev) => (
          <section key={ev.id} className="ev-card">
            <h2>Solicitudes de atención por evento · {ev.name}</h2>
            <p className="help">Solicitudes de ayuda del evento en ejecución. Asigne como responsable a un brigadista activo de la misma ubicación.</p>
            <IncidentesEvento session={session} eventoId={ev.id} modo="monitoreo" brigadistas={activos} />
          </section>
        ))}
        {enEjecucion.length === 0 && (
          <section className="ev-card">
            <h2>Solicitudes de atención por evento</h2>
            <div className="ev-empty">No hay un evento en ejecución. Las solicitudes aparecen cuando inicia uno.</div>
          </section>
        )}
      </main>
    </>
  );
}
