import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { Check, EmptyLogo, MapIcon } from '../../../shared/components/Icons';
import { errorMessage } from '../../../shared/services/http';
import { USE_MS03, activeAlertApi, type ActiveAlert } from '../services/activeAlert';
import { scopeText } from '../services/catalog';
import { useScopeCatalog } from '../hooks/useScopeCatalog';

const REFRESH_MS = 15000;
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
// Las instrucciones son un texto libre: cada línea es un paso.
const stepsOf = (text: string) => text.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);

export default function ActiveSimulation() {
  const [alert, setAlert] = useState<ActiveAlert | null>(null);
  // Nombres de edificios y zonas desde MS02; sin MS03 activo la pantalla es de demostración y no consulta.
  const { catalog } = useScopeCatalog(USE_MS03);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [routeInfo, setRouteInfo] = useState(false);

  const load = useCallback(() => activeAlertApi.getActiveAlert()
    .then((a) => { setAlert(a); setError(''); })
    .catch((e: unknown) => setError(errorMessage(e)))
    .finally(() => setLoading(false)), []);

  // Una alerta puede activarse o archivarse con la pantalla abierta: se vuelve a consultar mientras la pestaña está visible.
  useEffect(() => {
    load();
    const refresh = () => { if (document.visibilityState === 'visible') load(); };
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);

  const confirm = async () => {
    if (!alert || alert.confirmed) return;
    setConfirmError('');
    try { await activeAlertApi.confirmAlert(alert.id); setAlert({ ...alert, confirmed: true }); }
    catch (e) { setConfirmError(errorMessage(e)); }
  };

  if (!alert) {
    return (
      <main className="page">
        {loading && <p className="notice">Cargando alertas…</p>}
        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={load}>Reintentar</button></p>}
        {!loading && !error && <section className="alist empty"><EmptyLogo /><h2>El campus está seguro. No hay alertas activas</h2></section>}
      </main>
    );
  }

  const steps = stepsOf(alert.instructions);
  const operational = alert.types.length === 1 && alert.types[0] === 'OPERATIVA';
  return (
    <>
      <PageHeader badge="EN PROGRESO" title={alert.title} subtitle={`Alcance: ${scopeText(alert.scope, catalog)}`} context={`Iniciado: ${timeOf(alert.startedAt)}`} />
      <main className="content">
        <h2 className="title">{operational ? 'Instrucciones' : 'Instrucciones de Emergencia'}</h2>
        <div className="steps">
          {steps.map((t, i) => <div className="step" key={`${i}-${t}`}><span className="num">{i + 1}</span><p>{t}</p></div>)}
        </div>
        <div className="btns">
          <button className="btn navy" onClick={() => setRouteInfo(true)}><MapIcon />Ver Ruta de Evacuación Segura</button>
          <button className="btn deep" onClick={confirm} disabled={alert.confirmed}><Check />{alert.confirmed ? 'Alerta recibida' : 'Confirmar Recepción de Alerta'}</button>
        </div>
        {routeInfo && <p className="notice" role="status">La vista de rutas aún no está disponible en esta versión.</p>}
        {confirmError && <p className="notice err" role="alert">{confirmError}</p>}
        {alert.confirmed && <p className="notice" role="status">Recepción confirmada{USE_MS03 ? '.' : ' (registro local de demostración).'}</p>}
      </main>
    </>
  );
}
