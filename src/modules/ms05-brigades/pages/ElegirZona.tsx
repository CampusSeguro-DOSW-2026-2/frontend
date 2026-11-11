import { useEffect, useState } from 'react';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { eventsApi } from '../../ms06-drills/services/events';
import type { EventSummary, ScopeItem } from '../../ms06-drills/types';
import { scopeLabel } from '../../ms06-drills/utils/labels';
import { brigadesApi, tipoDesdeAlcance } from '../services/brigades';
import '../../ms06-drills/styles/events.css';

/** RF-BEI-01 (opción 2): el brigadista elige la zona del evento donde va a apoyar. */
export default function ElegirZona({ session, eventId }: { session: Session; eventId: string }) {
  const [event, setEvent] = useState<EventSummary | null | undefined>(undefined);
  const [selected, setSelected] = useState<ScopeItem | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    eventsApi.active(session)
      .then((list) => setEvent(list.find((e) => e.id === eventId) ?? null))
      .catch((err) => { setMessage(errorMessage(err)); setEvent(null); });
  }, [session, eventId]);

  const confirmar = async () => {
    if (!selected) { setMessage('Elige una zona.'); return; }
    setSaving(true);
    setMessage('');
    try {
      await brigadesApi.autoasignarse(session, eventId, selected.id, tipoDesdeAlcance(selected.type));
      window.location.hash = '#/brigadista';
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="ev-head">
        <div>
          <a className="back" href="#/brigadista">← Panel de responsabilidades</a>
          <h1>Elige tu zona</h1>
          <p>{event ? event.name : 'Evento'} · Tendrás una sola zona a la vez.</p>
        </div>
      </header>
      <main className="ev-main" style={{ maxWidth: 720 }}>
        {event === undefined && <p className="notice" role="status">Cargando evento…</p>}
        {event === null && !message && (
          <p className="notice err" role="alert">Este evento no está en ejecución o no te corresponde. Por ahora solo se puede elegir zona cuando el evento ya inició.</p>
        )}
        {event && (
          <fieldset className="ev-box">
            <legend className="lbl">Zonas del evento</legend>
            {event.scope.length === 0 && <p className="help">El evento no tiene zonas definidas.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {event.scope.map((s) => (
                <button key={s.id} type="button" className="pill" aria-pressed={selected?.id === s.id}
                  style={{ textAlign: 'left', padding: '14px 16px', fontSize: 15 }} onClick={() => setSelected(s)}>
                  {scopeLabel(s.id)} <span className="help">· {s.type === 'ZONE' ? 'Zona segura' : 'Edificio'}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {message && <p className="notice err" role="alert">{message}</p>}
        {event && <button type="button" className="btn red" onClick={confirmar} disabled={saving}>{saving ? 'Guardando…' : 'Confirmar mi zona'}</button>}
      </main>
    </>
  );
}
