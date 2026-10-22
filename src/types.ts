export interface Option { id: string; label: string }

export interface SimulationDraft {
  name: string; context: string; start: string; end: string;
  buildings: string[]; groups: string[]; managers: string[];
}

// Estados del ciclo de vida de MS05 (solicitudes de asistencia)
export type RequestStatus = 'REPORTADA' | 'ASIGNADA' | 'EN_ATENCION' | 'RESUELTA';

export interface AssistanceRequest {
  id: string; status: RequestStatus; priority: string;
  location: string; reporter: string; reportedAt: string; // ISO
}

export interface Brigadista { name: string; status: string; zone: string }

export interface RegisterDraft {
  firstName: string; secondName: string; firstLastName: string; secondLastName: string;
  email: string; password: string; confirmPassword: string;
}