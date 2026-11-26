import { useCallback, useEffect, useState } from 'react';
import { AlertaActiva } from '../../../shared/components/AlertaActiva';
import { Cargando } from '../../../shared/components/Cargando';
import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { ShieldCheck } from '../../../shared/components/Icons';
import { PageHeader } from '../../../shared/components/Layout';
import { Mensaje } from '../../../shared/components/Mensaje';
import { errorMessage } from '../../../shared/services/http';
import { formatDate } from '../../ms06-drills/utils/labels';
import { USE_MS03, activeAlertApi, type ActiveAlert } from '../services/activeAlert';
import { OPERATIONAL_TYPE, scopeText } from '../services/catalog';
import { useScopeCatalog } from '../hooks/useScopeCatalog';

const REFRESH_MS = 15000;

/**
 * Alerta activa dirigida al usuario. La tarjeta (instrucciones y «Confirmar recepción») es la misma que muestra Inicio:
 * shared/components/AlertaActiva.tsx, con la confirmación de MS03 (confirmAlert).
 */
export default function ActiveSimulation() {
  const [alert, setAlert] = useState<ActiveAlert | null>(null);
  // Nombres de edificios y zonas desde MS02; sin MS03 activo la pantalla es de demostración y no consulta.
  const { catalog } = useScopeCatalog(USE_MS03);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (!alert) {
    return (
      <main className="page">
        {loading && <Cargando texto="Cargando alertas…" />}
        {error && <Mensaje tono="error" onReintentar={load}>{error}</Mensaje>}
        {!loading && !error && (
          <EstadoVacio titulo="No hay alertas activas" icono={<ShieldCheck />}>El campus está seguro.</EstadoVacio>
        )}
      </main>
    );
  }

  return (
    <>
      <PageHeader badge="ALERTA · ACTIVA" title={alert.title} subtitle={`Alcance: ${scopeText(alert.scope, catalog, alert.scopes)}`}
        context={`Iniciada: ${formatDate(alert.startedAt)}`} />
      <main className="content">
        <AlertaActiva key={alert.id} mostrarTitulo={false}
          alerta={{
            titulo: alert.title,
            instrucciones: alert.instructions,
            operativa: alert.types.length === 1 && alert.types[0] === OPERATIONAL_TYPE,
            confirmada: alert.confirmed,
          }}
          nota={USE_MS03 ? undefined : '(Registro local de demostración.)'}
          onConfirmar={async () => {
            await activeAlertApi.confirmAlert(alert.id);
            setAlert((a) => (a && a.id === alert.id ? { ...a, confirmed: true } : a));
          }} />
      </main>
    </>
  );
}
