// Textos visibles de los códigos que devuelve MS01
export const STATE_LABEL: Record<string, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
};

export const ROLE_LABEL: Record<string, string> = {
  ESTUDIANTE: 'Estudiante',
  PROFESOR: 'Profesor',
  ADMINISTRATIVO: 'Administrativo',
  BRIGADISTA: 'Brigadista',
  COORDINADOR: 'Coordinador',
  ORGANIZADOR: 'Organizador',
  ADMIN: 'Administrador',
  AUDITOR: 'Auditor',
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }));
