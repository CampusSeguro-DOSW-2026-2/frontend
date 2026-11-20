import { useState } from 'react';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { brigadesApi } from '../services/brigades';
import type { EdificioEvento } from '../types';
import MapaCampus from './MapaCampus';

interface Props {
  session: Session;
  eventoId: string;
  /** Edificios del evento con su nombre ya resuelto (catálogo de MS02). */
  edificios: EdificioEvento[];
  miUbicacionId: string | null;
  activo: boolean;
  onAsignado: (nombre: string) => void | Promise<void>;
}

/**
 * Selector de edificio del evento: el mapa del campus y la confirmación antes de asignarse. Lo usan el panel de
 * responsabilidades y la auto asignación. El brigadista debe estar activo; el cambio de edificio lo valida MS05
 * (no puede dejar su edificio sin brigadistas).
 */
export default function SelectorZonaEvento({ session, eventoId, edificios, miUbicacionId, activo, onAsignado }: Props) {
  const [confirmar, setConfirmar] = useState<EdificioEvento | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const elegir = (edificio: EdificioEvento) => {
    setNotice('');
    setError('');
    if (!activo) { setNotice('Para asignarse a un edificio primero debe activarse.'); return; }
    if (edificio.ubicacionId === miUbicacionId) { setNotice(`Ya está asignado a ${edificio.nombre}.`); return; }
    setConfirmar(edificio);
  };

  const asignarse = async () => {
    if (!confirmar) return;
    setBusy(true);
    setError('');
    try {
      await brigadesApi.elegirEdificio(session, eventoId, confirmar.ubicacionId);
      const nombre = confirmar.nombre;
      setConfirmar(null);
      await onAsignado(nombre);
    } catch (err) {
      setConfirmar(null);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (edificios.length === 0) {
    return <div className="ev-empty">El evento todavía no tiene edificios registrados.</div>;
  }

  return (
    <>
      {notice && <p className="notice" role="status">{notice}</p>}
      {error && <p className="notice err" role="alert">{error}</p>}
      <MapaCampus edificios={edificios} miUbicacionId={miUbicacionId} deshabilitado={!activo || busy} onElegir={elegir} />

      {confirmar && (
        <div className="ev-modal-bg" role="presentation" onClick={() => setConfirmar(null)}>
          <div className="ev-modal" role="dialog" aria-modal="true" aria-labelledby="aa-confirmar" onClick={(e) => e.stopPropagation()}>
            <h2 id="aa-confirmar">{miUbicacionId ? 'Cambiar de edificio' : 'Asignarme a este edificio'}</h2>
            <p>
              {miUbicacionId
                ? <>Pasará de <b>{edificios.find((e) => e.ubicacionId === miUbicacionId)?.nombre ?? 'su edificio'}</b> a <b>{confirmar.nombre}</b>.</>
                : <>Quedará asignado a <b>{confirmar.nombre}</b>.</>}
            </p>
            <p className="help">{confirmar.brigadistasAsignados === 1 ? 'Hay 1 brigadista' : `Hay ${confirmar.brigadistasAsignados} brigadistas`} en este edificio.</p>
            <div className="row2">
              <button type="button" className="btn white" onClick={() => setConfirmar(null)} disabled={busy}>Cancelar</button>
              <button type="button" className="btn red" onClick={() => void asignarse()} disabled={busy}>{busy ? 'Guardando…' : 'Aceptar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
