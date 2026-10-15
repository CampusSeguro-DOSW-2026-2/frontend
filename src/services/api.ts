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
  getActiveSimulation(): Promise<{ startedAt: string }>;
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

export const api: CampusApi = localApi;
