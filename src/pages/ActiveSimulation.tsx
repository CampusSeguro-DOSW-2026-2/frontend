import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { Check, MapIcon } from '../components/Icons';
import { api } from '../services/api';
import type { Session } from '../types';

const STEPS = [
  'Agáchate, cúbrete debajo de una mesa y sostente.',
  'Evacúa ordenadamente usando las salidas indicadas.',
  'Dirígete inmediatamente al Punto de Encuentro X.',
];

export default function ActiveSimulation({ session }: { session: Session }) {
  const [started, setStarted] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [routeInfo, setRouteInfo] = useState(false);
  useEffect(() => {
    api.getActiveSimulation(session).then((s) => setStarted(s ? new Date(s.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''));
    api.isAlertConfirmed().then(setConfirmed);
  }, [session]);
  const confirm = async () => { if (confirmed) return; await api.confirmAlert(); setConfirmed(true); };

  return (
    <>
      <PageHeader badge="EN PROGRESO" title="Simulacro Sísmico Nacional" subtitle="Evacuación Prioritaria de Campus" context={started && `Iniciado: ${started}`} />
      <main className="content">
        <h2 className="title">Instrucciones de Emergencia</h2>
        <div className="steps">
          {STEPS.map((t, i) => <div className="step" key={t}><span className="num">{i + 1}</span><p>{t}</p></div>)}
        </div>
        <div className="btns">
          <button className="btn navy" onClick={() => setRouteInfo(true)}><MapIcon />Ver Ruta de Evacuación Segura</button>
          <button className="btn deep" onClick={confirm} disabled={confirmed}><Check />{confirmed ? 'Alerta recibida' : 'Confirmar Recepción de Alerta'}</button>
        </div>
        {routeInfo && <p className="notice" role="status">La vista de rutas aún no está disponible en esta versión.</p>}
        {confirmed && <p className="notice" role="status">Recepción confirmada (registro local de demostración).</p>}
      </main>
    </>
  );
}
