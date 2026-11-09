import { alertsApi } from './alerts';
import { ago, read, write } from '../../../shared/services/localStore';
import type { Session } from '../../../shared/types';

/**
 * Alerta activa que ve el destinatario. La confirmación (POST /{id}/confirmaciones) aún es local;
 * la fecha de activación sale de MS03 cuando VITE_USE_MS03=true.
 */
interface ActiveAlertApi {
  getActiveSimulation(session?: Session | null): Promise<{ startedAt: string } | null>;
  isAlertConfirmed(): Promise<boolean>;
  confirmAlert(): Promise<void>;
}

export const localApi: ActiveAlertApi = {
  async getActiveSimulation() { return { startedAt: read('cs.startedAt', ago(3)) }; },
  async isAlertConfirmed() { return read('cs.alertConfirmed', false); },
  async confirmAlert() { write('cs.alertConfirmed', true); },
};

// ---------------------------------------------------------------------------
// MS03 (Alertas) por el API Gateway. Solo lo que el backend ya expone hoy.
// La ruta /api/v1/alertas es protegida. Mientras el JWT de MS01 no sea aceptado por MS03, el cliente
// de alertas (ms03.ts) usa el token de desarrollo de MS03.
// ---------------------------------------------------------------------------
export const ms03Api: Pick<ActiveAlertApi, 'getActiveSimulation'> = {
  async getActiveSimulation(session) {
    // Sin sesión no hay token: la pantalla ya exige iniciar sesión, esto es solo una defensa
    if (!session) return localApi.getActiveSimulation();
    try {
      const page = await alertsApi.list({ status: 'ACTIVE', size: 1 });
      if (!page.content.length) return null; // no hay alerta activa
      const alert = await alertsApi.get(page.content[0].id);
      return alert.activatedAt ? { startedAt: alert.activatedAt } : null;
    } catch (e) {
      console.warn('MS03 no disponible, se usa el dato local de demostración.', e);
      return localApi.getActiveSimulation();
    }
  },
};

// Para activar MS03: VITE_USE_MS03=true
const useMs03 = import.meta.env.VITE_USE_MS03 === 'true';
export const activeAlertApi: ActiveAlertApi = useMs03 ? { ...localApi, ...ms03Api } : localApi;
