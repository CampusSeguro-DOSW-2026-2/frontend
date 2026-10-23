import { alertsApi } from './alerts';
import type { AssistanceRequest, Brigadista, Option, SimulationDraft } from '../types';

/**
 * Contrato que consumen las pantallas. Hoy lo implementa `localApi` (localStorage).
 * Para conectar el backend: crear `httpApi` con esta misma interfaz y cambiar
 * la exportación `api` al final. Los endpoints reales están PENDIENTES de contrato
 * con los otros squads; aquí no se inventa ninguno.
 */
export interface CampusApi {
  getCatalogs(): Promise<{ buildings: Option[]; groups: Option[]; managers: Option[] }>;
  saveSimulationDraft(d: SimulationDraft): Promise<void>;
  getActiveSimulation(): Promise<{ startedAt: string } | null>;
  isAlertConfirmed(): Promise<boolean>;
  confirmAlert(): Promise<void>;
  getBrigadista(): Promise<Brigadista>;
  getRequests(): Promise<AssistanceRequest[]>;
  resolveRequest(id: string): Promise<void>;
}

const read = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

// Datos de demostración (reemplazables por la respuesta del backend)
const opt = (l: string[]): Option[] => l.map((label) => ({ id: label, label }));
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const seedRequests = (): AssistanceRequest[] => [
  { id: 'sol-1', status: 'ASIGNADA', priority: 'MÉDICO urgente', location: 'Bloque A, Segundo Piso - Escaleras', reporter: 'Estudiante Valeria Pachón Pinzón reporta caída', reportedAt: ago(4) },
  { id: 'sol-2', status: 'REPORTADA', priority: '', location: '', reporter: '', reportedAt: ago(9) },
  { id: 'sol-3', status: 'REPORTADA', priority: '', location: '', reporter: '', reportedAt: ago(7) },
  { id: 'sol-4', status: 'REPORTADA', priority: '', location: '', reporter: '', reportedAt: ago(5) },
  { id: 'sol-5', status: 'EN_ATENCION', priority: '', location: '', reporter: '', reportedAt: ago(12) },
  { id: 'sol-6', status: 'EN_ATENCION', priority: '', location: '', reporter: '', reportedAt: ago(15) },
];

export const localApi: CampusApi = {
  async getCatalogs() {
    return {
      buildings: opt(['Edificio A', 'Edificio B', 'Edificio F', 'Edificio C', 'Edificio G']),
      groups: opt(['Estudiantes', 'Profesores', 'Personal administrativo']),
      managers: opt(['Jerónimo M. - Brigadista', 'Alejandra N. - Brigadista', 'Valeria P. - Coordinadora', 'Daniel G. - Brigadista']),
    };
  },
  async saveSimulationDraft(d) { write('cs.simulationDraft', d); },
  async getActiveSimulation() { return { startedAt: read('cs.startedAt', ago(3)) }; },
  async isAlertConfirmed() { return read('cs.alertConfirmed', false); },
  async confirmAlert() { write('cs.alertConfirmed', true); },
  async getBrigadista() { return { name: 'Jerónimo M.', status: 'DISPONIBLE', zone: 'Plazoleta Frente al Edificio F' }; },
  async getRequests() { return read('cs.requests', seedRequests()); },
  async resolveRequest(id) {
    const list = read('cs.requests', seedRequests()).map((r) => (r.id === id ? { ...r, status: 'RESUELTA' as const } : r));
    write('cs.requests', list);
  },
};

// ---------------------------------------------------------------------------
// MS03 (Alertas) por HTTP. Solo lo que el backend ya expone hoy.
// ---------------------------------------------------------------------------
export const ms03Api: Pick<CampusApi, 'getActiveSimulation'> = {
  async getActiveSimulation() {
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

// Lo que aún no tiene backend sigue en localApi. Para activar MS03: VITE_USE_MS03=true
const useMs03 = import.meta.env.VITE_USE_MS03 === 'true';
export const api: CampusApi = useMs03 ? { ...localApi, ...ms03Api } : localApi;
