export interface Option { id: string; label: string }

export interface SimulationDraft {
  name: string; context: string; start: string; end: string;
  buildings: string[]; groups: string[]; managers: string[];
}
