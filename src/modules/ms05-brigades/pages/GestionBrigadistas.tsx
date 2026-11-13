import { useEffect, useState } from 'react';
import { Search } from '../../../shared/components/Icons';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventSummary } from '../../ms06-drills/types';
import { SCOPE_OPTIONS, scopeLabel } from '../../ms06-drills/utils/labels';
import IncidentesEvento from '../components/IncidentesEvento';
import { brigadesApi, tipoDesdeAlcance } from '../services/brigades';
import type { BrigadistaEncontrado } from '../types';
import '../../ms06-drills/styles/events.css';

/**
 * RF-BEI-01 (opción 1) y RF-BEI-02: el coordinador o el organizador busca brigadistas y reasigna o retira su zona,
 * y monitorea los incidentes del evento en ejecución.
 */
export default function GestionBrigadistas({ session }: { session: Session }) {
  const [nombre, setNombre] = useState('');
  const [result, setResult] = useState<BrigadistaEncontrado[] | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [enEjecucion, setEnEjecucion] = useState<EventSummary[]>([]);

  useEffect(() => {
    eventsApi.active(session).then(setEnEjecucion).catch(() => setEnEjecucion([]));
  }, [session]);

  const buscar = async () => {
    if (!nombre.trim()) { setError('Escriba un nombre o apellido.'); return; }
    setError('');
    setMessage('');
    try {
      const res = await brigadesApi.buscar(session, nombre.trim());
      setResult([...res.resultados].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      if (res.mensaje) setMessage(res.mensaje);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const reasignar = async (idAsignacion: string, ubicacionId: string) => {
    const zona = SCOPE_OPTIONS.find((o) => o.id === ubicacionId);
    if (!zona) return;
    setBusy(idAsignacion);
    try {
      await brigadesApi.reasignar(session, idAsignacion, zona.id, tipoDesdeAlcance(zona.type));
      await buscar();
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
      await buscar();
      setMessage('Asignación retirada.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <header className="ev-head">
        <div>
          <h1>Gestión de brigadistas</h1>
          <p>Los brigadistas eligen su zona al recibir la alerta. Aquí los buscas y reasignas, temporalmente, a las zonas que necesitan más apoyo.</p>
        </div>
      </header>
      <main className="ev-main">
        <form className="searchbar" role="search" onSubmit={(e) => { e.preventDefault(); buscar(); }}>
          <input aria-label="Buscar por nombre o apellido" placeholder="Buscar por nombre o apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <button type="submit" aria-label="Buscar"><Search /></button>
        </form>
        {error && <p className="notice err" role="alert">{error}</p>}
        {message && <p className="notice" role="status">{message}</p>}
        {result && result.length === 0 && <div className="ev-empty">No hay brigadistas con ese nombre.</div>}
        {result && result.length > 0 && (
          <table className="ev-table">
            <thead><tr><th>Brigadista</th><th>Estado</th><th>Zona en el evento</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
            <tbody>
              {result.flatMap((b) => {
                const vigentes = b.asignaciones.filter((a) => a.estado === 'VIGENTE');
                const estado = <span className={`st ${b.estado === 'ACTIVO' ? 'FINISHED' : 'DRAFT'}`}>{b.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}</span>;
                if (vigentes.length === 0) {
                  return [<tr key={b.idBrigadista}><td><div className="t">{b.nombre}</div></td><td>{estado}</td><td className="help">Sin zona</td><td /></tr>];
                }
                return vigentes.map((a) => (
                  <tr key={a.idAsignacion}>
                    <td><div className="t">{b.nombre}</div><div className="s">Evento {a.eventoId.slice(0, 8)}</div></td>
                    <td>{estado}</td>
                    <td>
                      <select aria-label={`Zona de ${b.nombre}`} value={a.ubicacionId} disabled={busy === a.idAsignacion}
                        onChange={(e) => reasignar(a.idAsignacion, e.target.value)}
                        style={{ font: 'inherit', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}>
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
            <h2>Incidentes · {ev.name}</h2>
            <p className="help">Todos los incidentes reportados en el evento en ejecución, con su estado y si ya tienen un brigadista responsable.</p>
            <IncidentesEvento session={session} eventoId={ev.id} modo="monitoreo" />
          </section>
        ))}
      </main>
    </>
  );
}
