import { ago, read, write } from '../../../shared/services/localStore';
import type { AssistanceRequest, Brigadista } from '../types';

// MS05 (Brigadas) está PENDIENTE de contrato: los datos son locales y no se inventa ningún endpoint.
const seedRequests = (): AssistanceRequest[] => [
  { id: 'sol-1', status: 'ASIGNADA', priority: 'MÉDICO urgente', location: 'Bloque A, Segundo Piso - Escaleras', reporter: 'Estudiante Valeria Pachón Pinzón reporta caída', reportedAt: ago(4) },
  { id: 'sol-2', status: 'REPORTADA', priority: '', location: '', reporter: '', reportedAt: ago(9) },
  { id: 'sol-3', status: 'REPORTADA', priority: '', location: '', reporter: '', reportedAt: ago(7) },
  { id: 'sol-4', status: 'REPORTADA', priority: '', location: '', reporter: '', reportedAt: ago(5) },
  { id: 'sol-5', status: 'EN_ATENCION', priority: '', location: '', reporter: '', reportedAt: ago(12) },
  { id: 'sol-6', status: 'EN_ATENCION', priority: '', location: '', reporter: '', reportedAt: ago(15) },
];

export const brigadesApi = {
  async getBrigadista(): Promise<Brigadista> { return { name: 'Jerónimo M.', status: 'DISPONIBLE', zone: 'Plazoleta Frente al Edificio F' }; },
  async getRequests(): Promise<AssistanceRequest[]> { return read('cs.requests', seedRequests()); },
  async resolveRequest(id: string): Promise<void> {
    const list = read('cs.requests', seedRequests()).map((r) => (r.id === id ? { ...r, status: 'RESUELTA' as const } : r));
    write('cs.requests', list);
  },
};
