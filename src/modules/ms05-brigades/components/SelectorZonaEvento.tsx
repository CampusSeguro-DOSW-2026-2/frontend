import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { Mensaje } from '../../../shared/components/Mensaje';
import { useState } from 'react';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { brigadesApi } from '../services/brigades';
import type { EdificioEvento } from '../types';
import Dialogo from './Dialogo';
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
    return <EstadoVacio titulo="El evento todavía no tiene edificios registrados" />;
  }

  return (
    <>
      {notice && <Mensaje tono="info">{notice}</Mensaje>}
      {error && <Mensaje tono="error">{error}</Mensaje>}
      <MapaCampus edificios={edificios} miUbicacionId={miUbicacionId} deshabilitado={!activo || busy} onElegir={elegir} />

      {confirmar && (
        <Dialogo
          titulo={miUbicacionId ? `¿Cambiar su zona a ${confirmar.nombre}?` : `¿Asignarse a ${confirmar.nombre}?`}
          onCerrar={() => setConfirmar(null)}
          ocupado={busy}
          botones={(
            <>
              <button type="button" className="btn red" data-foco onClick={() => void asignarse()} disabled={busy} aria-busy={busy || undefined}>
                {busy ? 'Guardando…' : miUbicacionId ? 'Cambiar mi zona' : 'Asignarme aquí'}
              </button>
              <button type="button" className="btn white" onClick={() => setConfirmar(null)} disabled={busy}>Cancelar</button>
            </>
          )}
        >
          <p>
            {miUbicacionId
              ? <>Pasará de <b>{edificios.find((e) => e.ubicacionId === miUbicacionId)?.nombre ?? 'su zona'}</b> a <b>{confirmar.nombre}</b>.</>
              : <>Recibirá los incidentes de <b>{confirmar.nombre}</b>.</>}
            {' '}{confirmar.brigadistasAsignados === 1 ? 'Hay 1 brigadista' : `Hay ${confirmar.brigadistasAsignados} brigadistas`} en este lugar.
          </p>
        </Dialogo>
      )}
    </>
  );
}
