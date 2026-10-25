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

// Módulo al que pertenece cada permiso (primer segmento del código ms:recurso:acción)
export const MODULE_LABEL: Record<string, string> = {
  ms01: 'Identidad y acceso',
  ms02: 'Campus y seguridad',
  ms03: 'Alertas y emergencias',
  ms04: 'Evacuación y check-in',
  ms05: 'Brigadistas e incidentes',
  ms06: 'Simulacros',
  ms07: 'Formación y asistente IA',
  ms08: 'Analítica y auditoría',
};

// Descripción de cada permiso según la matriz rol-permiso de MS01; si llega un código que no está
// aquí, la pantalla muestra el código tal cual
export const PERMISSION_LABEL: Record<string, string> = {
  'ms01:profile:read': 'Consultar el propio perfil',
  'ms01:profile:write': 'Actualizar el propio perfil (nombres y apellidos)',
  'ms01:password:change': 'Cambiar la propia contraseña',
  'ms01:session:logout': 'Cerrar sesión',
  'ms01:role:read_own': 'Consultar los propios roles y sus permisos',
  'ms01:role:read_all': 'Consultar el catálogo completo de roles y permisos',
  'ms01:user:read': 'Listar, buscar y consultar usuarios',
  'ms01:user:status': 'Activar o inactivar usuarios',
  'ms01:user:roles': 'Agregar o retirar roles a usuarios',
  'ms02:campus:read': 'Consultar edificios, pisos, espacios y zonas seguras (puntos de encuentro)',
  'ms02:route:read': 'Consultar la ruta de evacuación recomendada y listar o ver las rutas de evacuación',
  'ms02:preventive_info:read': 'Consultar información preventiva por edificio o espacio',
  'ms02:building:write': 'Crear, modificar e inactivar edificios y pisos',
  'ms02:space:write': 'Gestionar espacios',
  'ms02:safe_zone:write': 'Gestionar zonas seguras y puntos de encuentro (un mismo recurso)',
  'ms02:route:write': 'Asociar espacios con rutas de evacuación y modificar su descripción o destino',
  'ms02:route_status:write': 'Cambiar el estado de una ruta (disponible, bloqueada, restringida)',
  'ms02:qr:manage': 'Asociar códigos QR a zonas o edificios (opcional)',
  'ms03:alert:receive': 'Recibir alertas y confirmar su recepción',
  'ms03:alert:manage': 'Crear, programar, activar, segmentar, modificar y finalizar alertas de cualquier tipo',
  'ms03:alert:manage_drill': 'Igual que el anterior, solo para alertas de tipo SIMULACRO (originadas desde MS06)',
  'ms03:alert:read_history': 'Consultar el historial de alertas',
  'ms04:checkin:write': 'Reportar y actualizar el propio estado y punto de encuentro',
  'ms04:checkin:read_own': 'Consultar el propio estado vigente',
  'ms04:assistance:request': 'Solicitar asistencia desde el check-in',
  'ms04:dashboard:read': 'Ver consolidación por punto de encuentro, personas pendientes y dashboard',
  'ms04:history:read': 'Consultar el histórico de check-ins de un evento',
  'ms05:brigadier:assign': 'Asignar brigadistas a edificios, zonas o puntos de encuentro',
  'ms05:panel:read_own': 'Consultar las propias zonas y tareas asignadas',
  'ms05:assistance:read': 'Consultar solicitudes de asistencia',
  'ms05:assistance:register': 'Registrar una solicitud de asistencia',
  'ms05:assistance:assign': 'Asignar una solicitud a un brigadista y cerrarla',
  'ms05:assistance:update_status': 'Cambiar el estado de atención (en atención, resuelta)',
  'ms05:incident:report': 'Registrar un incidente con descripción y evidencia',
  'ms05:incident:read': 'Consultar y dar seguimiento a incidentes',
  'ms05:incident:update': 'Actualizar un incidente',
  'ms06:drill:manage': 'Crear y editar simulacros, escenario y participantes',
  'ms06:drill:execute': 'Iniciar y terminar un simulacro',
  'ms06:drill:evaluate': 'Evaluar un simulacro',
  'ms06:drill:read': 'Consultar simulacros y su seguimiento',
  'ms06:drill:compare_report': 'Comparar simulacros y consultar el informe final',
  'ms07:content:read': 'Consultar contenidos del centro de aprendizaje',
  'ms07:quiz:take': 'Realizar evaluaciones y consultar el propio progreso',
  'ms07:tutor:use': 'Usar el tutor CampusSeguro',
  'ms07:content:manage': 'Gestionar contenidos y la información que alimenta al tutor',
  'ms08:indicators:read': 'Consultar indicadores operativos e históricos',
  'ms08:audit:read': 'Consultar la auditoría',
};
