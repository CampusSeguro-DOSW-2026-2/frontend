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

// Roles y permisos (MS01 · KAIR-41 y KAIR-36)
// Un rol del catálogo con los códigos de permiso (ms:recurso:acción) que le concede la matriz
export interface RolePermissions { role: string; permissions: string[] }

// Roles que tiene un usuario después de cambiarlos
export interface RoleChange { id: string; roles: string[] }

// Cambio pedido en el formulario F-09: roles a agregar y roles a retirar
export interface RolesDraft { add: string[]; remove: string[] }

// Cambio de contraseña autenticado (MS01 · F-06): contraseña actual, nueva y su confirmación
export interface PasswordChangeDraft { current: string; next: string; confirm: string }

// Nueva contraseña tras la recuperación (MS01 · F-05): la nueva contraseña y su confirmación
export interface PasswordResetDraft { password: string; confirmPassword: string }
