/**
 * Etiquetas legibles de los códigos que devuelven los servicios. Ningún código crudo (EN_EJECUCION, IN_PROGRESS,
 * FUERA_DE_ALCANCE…) se muestra a la persona: se usa etiquetaCodigo() o, para texto libre del servidor, textoLegible().
 * Solo cambia cómo se muestra; el código que se envía o se compara sigue igual.
 */

const CODIGOS: Record<string, string> = {
  // Ciclo de vida de eventos, alertas y simulacros (español e inglés)
  BORRADOR: 'Borrador', PROGRAMADO: 'Programado', PROGRAMADA: 'Programada', EN_EJECUCION: 'En ejecución',
  FINALIZADO: 'Finalizado', FINALIZADA: 'Finalizada', EVALUADO: 'Evaluado', ACTIVA: 'Activa', ARCHIVADA: 'Archivada',
  DRAFT: 'Borrador', SCHEDULED: 'Programado', IN_PROGRESS: 'En ejecución', FINISHED: 'Finalizado', EVALUATED: 'Evaluado',
  ACTIVE: 'Activo', INACTIVE: 'Inactivo', ARCHIVED: 'Archivada', CANCELLED: 'Cancelado', CANCELADO: 'Cancelado',
  // Estado de registros
  ACTIVO: 'Activo', INACTIVO: 'Inactivo', DISPONIBLE: 'Disponible', NO_DISPONIBLE: 'No disponible',
  BLOQUEADA: 'Bloqueada', BLOQUEADO: 'Bloqueado', RESTRINGIDA: 'Restringida', RESTRINGIDO: 'Restringido',
  FUERA_DE_SERVICIO: 'Fuera de servicio', SIN_COORDENADAS: 'Sin coordenadas',
  // Check-in
  SAFE: 'A salvo', EVACUATING: 'Evacuando', NEEDS_ASSISTANCE: 'Requiere asistencia', OFF_CAMPUS: 'Fuera del campus',
  ENVIADA: 'Enviada', PENDIENTE_ENVIO: 'Pendiente de envío', RECHAZADA: 'Rechazada',
  // Incidentes y atención
  REPORTADA: 'Reportada', REPORTADO: 'Reportado', ASIGNADA: 'Asignada', ASIGNADO: 'Asignado', EN_ATENCION: 'En atención',
  RESUELTA: 'Resuelta', RESUELTO: 'Resuelto', CERRADA: 'Cerrada', CERRADO: 'Cerrado', PENDIENTE: 'Pendiente',
  URGENCIA_ALTA: 'Urgencia alta', URGENCIA_MODERADA: 'Urgencia moderada', URGENCIA_BAJA: 'Urgencia baja',
  // Resultados
  EXITO: 'Éxito', FALLO: 'Fallo', SUCCESS: 'Éxito', FAILURE: 'Fallo', PENDING: 'Pendiente', FUERA_DE_ALCANCE: 'Fuera de alcance',
  // Tipos
  SIMULACRO: 'Simulacro', REAL: 'Evento real', OPERATIVA: 'Operativa', SISMO: 'Sismo', CAMPUS: 'Todo el campus',
  EDIFICIO: 'Edificio', ZONA: 'Zona', PUNTO_ENCUENTRO: 'Punto de encuentro',
};

/** Palabras sin tilde que llegan en códigos del servidor (roles creados por el administrador, tipos, etc.). */
const TILDES: Record<string, string> = {
  evacuacion: 'evacuación', coordinacion: 'coordinación', administracion: 'administración', atencion: 'atención',
  comunicacion: 'comunicación', informacion: 'información', prevencion: 'prevención', gestion: 'gestión',
  operacion: 'operación', direccion: 'dirección', planeacion: 'planeación', capacitacion: 'capacitación',
  formacion: 'formación', ubicacion: 'ubicación', asignacion: 'asignación', evaluacion: 'evaluación',
  logistica: 'logística', tecnico: 'técnico', tecnica: 'técnica', academico: 'académico', academica: 'académica',
  auditoria: 'auditoría', medico: 'médico', medica: 'médica', enfermeria: 'enfermería', psicologia: 'psicología',
  analitica: 'analítica', practicas: 'prácticas', publico: 'público', energia: 'energía', electrico: 'eléctrico',
  quimico: 'químico', laboratorio: 'laboratorio', vigilancia: 'vigilancia', primeros: 'primeros', auxilios: 'auxilios',
  lider: 'líder', guia: 'guía', area: 'área', via: 'vía', sesion: 'sesión', transito: 'tránsito', accion: 'acción',
};

const corregirTildes = (texto: string) =>
  texto.replace(/[A-Za-zñÑ]+/g, (palabra) => {
    const con = TILDES[palabra.toLowerCase()];
    if (!con) return palabra;
    return palabra[0] === palabra[0].toUpperCase() ? con.charAt(0).toUpperCase() + con.slice(1) : con;
  });

/** Código en MAYÚSCULAS_CON_GUION a frase: «MONITOR_EVACUACION» → «Monitor evacuación». */
export function codigoAFrase(codigo: string): string {
  const texto = corregirTildes(codigo.replace(/_+/g, ' ').trim().toLowerCase());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Etiqueta legible de un código de estado, tipo o resultado; nunca devuelve el código crudo. */
export function etiquetaCodigo(codigo: string | null | undefined): string {
  if (!codigo) return '—';
  const clave = codigo.trim().toUpperCase();
  return CODIGOS[clave] ?? codigoAFrase(codigo);
}

const ROLES: Record<string, string> = {
  ESTUDIANTE: 'Estudiante', PROFESOR: 'Profesor', ADMINISTRATIVO: 'Personal administrativo', BRIGADISTA: 'Brigadista',
  COORDINADOR: 'Coordinador de emergencias', ORGANIZADOR: 'Organizador de simulacros', ADMIN: 'Administrador',
  AUDITOR: 'Auditor',
};

/** Nombre visible de un rol: los iniciales con su nombre completo; los creados por el administrador, como frase con tildes. */
export function etiquetaRol(rol: string): string {
  return ROLES[rol] ?? codigoAFrase(rol);
}

/** Palabras sueltas en inglés que llegan en textos del servidor. */
const INGLES: Record<string, string> = { true: 'sí', false: 'no', null: 'vacío', status: 'estado', state: 'estado' };

/**
 * Texto libre del servidor (por ejemplo, el detalle de un registro de auditoría) en español legible: los códigos en
 * MAYÚSCULAS pasan a su etiqueta, «->» a «→» y algunas palabras en inglés a español.
 */
export function textoLegible(texto: string): string {
  return texto
    .replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b|\b[A-Z]{4,}\b/g, (codigo) => (CODIGOS[codigo] ? CODIGOS[codigo] : codigo.includes('_') ? codigoAFrase(codigo) : codigo))
    .replace(/\s*->\s*/g, ' → ')
    .replace(/\b(true|false|null|status|state)\b/gi, (w) => INGLES[w.toLowerCase()] ?? w);
}
