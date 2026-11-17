import { alertsApi, type AlertType, type Scope } from './alerts';
import { ago, read, write } from '../../../shared/services/localStore';

/** Alerta activa que ve el destinatario en su pantalla de inicio. */
export interface ActiveAlert {
  id: string; types: AlertType[]; title: string; instructions: string; scope: Scope; startedAt: string; confirmed: boolean;
}

interface ActiveAlertApi {
  /** La alerta activa más reciente dirigida al usuario, o null si no hay ninguna. */
  getActiveAlert(): Promise<ActiveAlert | null>;
  confirmAlert(id: string): Promise<void>;
}

// Para activar MS03: VITE_USE_MS03=true. Sin eso la pantalla usa datos locales de demostración.
export const USE_MS03 = import.meta.env.VITE_USE_MS03 === 'true';

export const localApi: ActiveAlertApi = {
  async getActiveAlert() {
    return {
      id: 'demo', types: ['EARTHQUAKE'], title: 'Simulacro Sísmico Nacional', scope: { type: 'CAMPUS' },
      instructions: [
        'Agáchate, cúbrete debajo de una mesa y sostente.',
        'Evacúe ordenadamente por las salidas indicadas.',
        'Diríjase al Punto de Encuentro X.',
      ].join('\n'),
      startedAt: read('cs.startedAt', ago(3)),
      confirmed: read('cs.alertConfirmed', false),
    };
  },
  async confirmAlert() { write('cs.alertConfirmed', true); },
};

// ---------------------------------------------------------------------------
// MS03 (Alertas) por el API Gateway: bandeja personal y confirmación de recepción.
// GET /api/v1/alertas/mias devuelve solo las alertas dirigidas al usuario (por su id, por su rol o por
// una notificación enviada), ordenadas de la más reciente a la más antigua; `confirmedAt` indica si ya confirmó.
// ---------------------------------------------------------------------------
export const ms03Api: ActiveAlertApi = {
  async getActiveAlert() {
    const page = await alertsApi.inbox({ status: 'ACTIVE', size: 1 });
    const alert = page.content[0];
    if (!alert) return null;
    return {
      id: alert.id, types: alert.types, title: alert.title, scope: alert.scope, instructions: alert.instructions,
      startedAt: alert.activatedAt ?? new Date().toISOString(), confirmed: alert.confirmedAt !== null,
    };
  },
  async confirmAlert(id) { await alertsApi.confirm(id); },
};

export const activeAlertApi: ActiveAlertApi = USE_MS03 ? ms03Api : localApi;
