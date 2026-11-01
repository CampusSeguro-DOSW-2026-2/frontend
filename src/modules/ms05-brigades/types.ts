// Estados del ciclo de vida de MS05 (solicitudes de asistencia)
export type RequestStatus = 'REPORTADA' | 'ASIGNADA' | 'EN_ATENCION' | 'RESUELTA';

export interface AssistanceRequest {
  id: string; status: RequestStatus; priority: string;
  location: string; reporter: string; reportedAt: string; // ISO
}

export interface Brigadista { name: string; status: string; zone: string }
