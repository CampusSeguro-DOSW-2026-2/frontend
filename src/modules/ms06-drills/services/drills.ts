import { write } from '../../../shared/services/localStore';
import type { Option, SimulationDraft } from '../types';

// MS06 (Simulacros) está PENDIENTE de contrato: los datos son locales y no se inventa ningún endpoint.
const opt = (l: string[]): Option[] => l.map((label) => ({ id: label, label }));

export const drillsApi = {
  async getCatalogs(): Promise<{ buildings: Option[]; groups: Option[]; managers: Option[] }> {
    return {
      buildings: opt(['Edificio A', 'Edificio B', 'Edificio F', 'Edificio C', 'Edificio G']),
      groups: opt(['Estudiantes', 'Profesores', 'Personal administrativo']),
      managers: opt(['Jerónimo M. - Brigadista', 'Alejandra N. - Brigadista', 'Valeria P. - Coordinadora', 'Daniel G. - Brigadista']),
    };
  },
  async saveSimulationDraft(d: SimulationDraft): Promise<void> { write('cs.simulationDraft', d); },
};
