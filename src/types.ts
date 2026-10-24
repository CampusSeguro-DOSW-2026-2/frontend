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

// Inicio de sesión (MS01 · F-02)
export interface LoginDraft {
  email: string;
  password: string;
}

export interface SessionUser {
  id: string;
  email: string;
  roles: string[];
}

// Sesión que devuelve MS01 al autenticar: el token se guarda junto con su vencimiento
export interface Session {
  token: string;
  tokenType: string;
  expiresAt: string; // ISO
  user: SessionUser;
}

// Perfil y administración de usuarios (MS01 · KAIR-46 y KAIR-51)
export interface ProfileData {
  firstName: string; secondName: string; firstLastName: string; secondLastName: string;
  email: string; roles: string[]; state: string;
}

// Lo que el usuario puede cambiar de su propio perfil
export interface ProfileDraft {
  firstName: string; secondName: string; firstLastName: string; secondLastName: string;
}

// Fila del listado de usuarios (solo administradores y auditores)
export interface UserSummary { id: string; email: string; roles: string[]; state: string }

export interface UserPage {
  items: UserSummary[]; page: number; size: number; totalElements: number; totalPages: number;
}

// Criterios del listado: correo (parcial), estado y rol ('' = todos), página y tamaño
export interface UserSearch { email: string; state: string; role: string; page: number; size: number }

// Resultado del cambio de estado de un usuario
export interface StatusChange { id: string; previous: string; next: string }
