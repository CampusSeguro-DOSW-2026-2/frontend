/**
 * Fechas de MS08: el servicio trabaja en UTC y la pantalla muestra la hora de Bogotá (UTC-5, sin horario de verano),
 * igual que Eventos. Los filtros de fecha son días de Bogotá convertidos a instantes UTC.
 */
export const TIME_ZONE = 'America/Bogota';
const BOGOTA_OFFSET = '-05:00';

const DAY = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit' });

/** "14 nov 2026 · 9:30:12 a. m." (como en Eventos) en hora de Bogotá, o el texto alterno si no hay fecha. */
export function formatBogota(iso: string | null | undefined, empty = 'Sin fecha'): string {
  if (!iso) return empty;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return empty;
  const part = (type: string) => DAY.formatToParts(d).find((p) => p.type === type)?.value ?? '';
  return `${part('day')} ${part('month').replace('.', '')} ${part('year')} · ${TIME.format(d)}`;
}

/** Primer instante del día de Bogotá, en ISO UTC (2026-11-14 → 2026-11-14T05:00:00.000Z). */
export const startOfDayUtc = (day: string): string => new Date(`${day}T00:00:00${BOGOTA_OFFSET}`).toISOString();

/** Último instante del día de Bogotá, en ISO UTC (el filtro "hasta" incluye el día completo). */
export const endOfDayUtc = (day: string): string => new Date(`${day}T23:59:59.999${BOGOTA_OFFSET}`).toISOString();

/** Hoy en Bogotá como AAAA-MM-DD (tope de los selectores de fecha). */
export const todayInBogota = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string): boolean => UUID.test(value.trim());

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min`;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

/** Microservicios que emiten auditoría (campo `modulo`). */
export const MODULES: { id: string; label: string }[] = [
  { id: 'MS01', label: 'MS01 · Identidad y acceso' },
  { id: 'MS02', label: 'MS02 · Campus y seguridad' },
  { id: 'MS03', label: 'MS03 · Alertas y emergencias' },
  { id: 'MS04', label: 'MS04 · Evacuación y check-in' },
  { id: 'MS05', label: 'MS05 · Brigadistas e incidentes' },
  { id: 'MS06', label: 'MS06 · Simulacros y eventos' },
  { id: 'MS07', label: 'MS07 · Capacitación y asistente' },
  { id: 'MS08', label: 'MS08 · Analítica y auditoría' },
];

/**
 * Acciones de auditoría de cada microservicio (documentation/integration/audit-catalog.md) con su nombre en español,
 * para filtrar por nombre y no por código. Un código que no esté aquí se muestra legible con `actionLabel`.
 */
export const ACTIONS: { modulo: string; codigo: string; label: string }[] = [
  ...([
    ['REGISTRO', 'Registro de usuario'], ['LOGIN', 'Inicio de sesión'], ['LOGOUT', 'Cierre de sesión'],
    ['CAMBIO_ROL', 'Cambio de roles'], ['CAMBIO_ESTADO', 'Cambio de estado de la cuenta'], ['CAMBIO_CONTRASENA', 'Cambio de contraseña'],
    ['RECUPERACION', 'Recuperación de contraseña'], ['CREACION_ROL', 'Creación de rol'], ['EDICION_ROL', 'Edición de rol'],
    ['CAMBIO_PERMISOS_ROL', 'Cambio de permisos de un rol'], ['ELIMINACION_ROL', 'Eliminación de rol'],
  ] as const).map(([codigo, label]) => ({ modulo: 'MS01', codigo, label })),
  ...([
    ['EDIFICIO_CREADO', 'Edificio creado'], ['EDIFICIO_ACTUALIZADO', 'Edificio actualizado'], ['EDIFICIO_DESACTIVADO', 'Edificio desactivado'],
    ['EDIFICIO_REACTIVADO', 'Edificio reactivado'], ['PISO_CREADO', 'Piso creado'], ['PISO_ACTUALIZADO', 'Piso actualizado'],
    ['PISO_DESACTIVADO', 'Piso desactivado'], ['PISO_REACTIVADO', 'Piso reactivado'], ['ESPACIO_CREADO', 'Espacio creado'],
    ['ESPACIO_ACTUALIZADO', 'Espacio actualizado'], ['ESPACIO_DESACTIVADO', 'Espacio desactivado'], ['ESPACIO_REACTIVADO', 'Espacio reactivado'],
    ['ZONA_SEGURA_CREADA', 'Zona segura creada'], ['ZONA_SEGURA_ACTUALIZADA', 'Zona segura actualizada'],
    ['ZONA_SEGURA_DESACTIVADA', 'Zona segura desactivada'], ['ZONA_SEGURA_REACTIVADA', 'Zona segura reactivada'],
    ['RUTA_CREADA', 'Ruta creada'], ['RUTA_ACTUALIZADA', 'Ruta actualizada'], ['RUTA_ESTADO_CAMBIADO', 'Cambio de estado de una ruta'],
    ['RECOMENDACION_CREADA', 'Recomendación creada'], ['RECOMENDACION_ACTUALIZADA', 'Recomendación actualizada'],
    ['RECOMENDACION_DESACTIVADA', 'Recomendación desactivada'],
  ] as const).map(([codigo, label]) => ({ modulo: 'MS02', codigo, label })),
  ...([
    ['CREATE', 'Alerta creada'], ['UPDATE', 'Alerta editada'], ['SCHEDULE', 'Alerta programada'], ['ACTIVATE', 'Alerta activada'],
    ['ARCHIVE', 'Alerta archivada'], ['NOTIFICATION_SENT', 'Notificación enviada'], ['NOTIFICATION_FAILED', 'Notificación fallida'],
    ['CONFIRM', 'Confirmación de recepción'], ['RECIPIENT_RESOLUTION_FAILED', 'Destinatarios no resueltos'],
  ] as const).map(([codigo, label]) => ({ modulo: 'MS03', codigo, label })),
  ...([
    ['REGISTRO_CHECKIN', 'Registro de check-in'], ['CAMBIO_ESTADO_CHECKIN', 'Cambio de estado del check-in'],
    ['SOLICITUD_ASISTENCIA', 'Solicitud de asistencia'], ['CAMBIO_ESTADO_EVENTO', 'Cambio de estado del evento'],
  ] as const).map(([codigo, label]) => ({ modulo: 'MS04', codigo, label })),
  ...([
    ['CREAR_INCIDENTE', 'Incidente reportado'], ['EDITAR_INCIDENTE', 'Incidente editado'], ['ASIGNAR_RESPONSABLE', 'Responsable asignado'],
    ['INICIAR_ATENCION', 'Inicio de la atención'], ['RESOLVER_INCIDENTE', 'Incidente resuelto'], ['CERRAR_INCIDENTE', 'Incidente cerrado'],
    ['CARGAR_EVIDENCIA', 'Evidencia cargada'], ['CREACION', 'Asignación de brigadista'], ['MODIFICACION', 'Cambio de asignación'],
    ['RETIRO', 'Retiro de brigadista'],
  ] as const).map(([codigo, label]) => ({ modulo: 'MS05', codigo, label })),
  ...([
    ['EVENT_CREATED', 'Evento creado'], ['EVENT_UPDATED', 'Evento editado'], ['EVENT_STATUS_CHANGED', 'Cambio de estado del evento'],
    ['EVENT_STARTED', 'Evento iniciado'], ['EVENT_FINISHED', 'Evento finalizado'], ['EVENT_TYPE_CREATED', 'Tipo de evento creado'],
  ] as const).map(([codigo, label]) => ({ modulo: 'MS06', codigo, label })),
  ...([
    ['TUTOR_QUERY', 'Consulta al tutor'], ['EVALUACION_CREADA', 'Evaluación creada'], ['EVALUACION_ACTUALIZADA', 'Evaluación actualizada'],
    ['INTENTO_REGISTRADO', 'Intento de evaluación'], ['EVALUACION_DESACTIVADA', 'Evaluación desactivada'],
    ['EVALUACION_REACTIVADA', 'Evaluación reactivada'], ['CONTENIDO_CREADO', 'Contenido creado'], ['CONTENIDO_ACTUALIZADO', 'Contenido actualizado'],
    ['CONTENIDO_DESACTIVADO', 'Contenido desactivado'], ['CONTENIDO_REACTIVADO', 'Contenido reactivado'], ['CATEGORIA_CREADA', 'Categoría creada'],
    ['CATEGORIA_ACTUALIZADA', 'Categoría actualizada'], ['CATEGORIA_DESACTIVADA', 'Categoría desactivada'],
    ['CATEGORIA_REACTIVADA', 'Categoría reactivada'],
  ] as const).map(([codigo, label]) => ({ modulo: 'MS07', codigo, label })),
];

/** "INICIO_SESION" → "Inicio sesion": código legible cuando no está en el catálogo. */
const readable = (code: string) => {
  const text = code.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Nombre de la acción de un registro; el mismo código puede existir en dos módulos (por ejemplo, CAMBIO_ESTADO). */
export function actionLabel(modulo: string, codigo: string): string {
  return (ACTIONS.find((a) => a.modulo === modulo && a.codigo === codigo) ?? ACTIONS.find((a) => a.codigo === codigo))?.label
    ?? readable(codigo);
}

export const moduleLabel = (id: string): string => MODULES.find((m) => m.id === id)?.label.replace(/^MS\d+ · /, '') ?? id;

/** Tipo del recurso afectado (`usuario:<id>` → Usuario). */
const RESOURCE_LABEL: Record<string, string> = {
  usuario: 'Usuario', rol: 'Rol', edificio: 'Edificio', piso: 'Piso', espacio: 'Espacio', zona_segura: 'Zona segura',
  ruta: 'Ruta de evacuación', recomendacion: 'Recomendación', alerta: 'Alerta', checkin: 'Check-in', evento: 'Evento',
  incidente: 'Incidente', evidencia: 'Evidencia', asignacion: 'Asignación', tipo_evento: 'Tipo de evento',
  evaluacion: 'Evaluación', intento: 'Intento', contenido: 'Contenido', categoria: 'Categoría',
};

/** Recurso afectado partido en tipo legible y valor (`rol:ADMIN` → { tipo: 'Rol', valor: 'ADMIN' }). */
export function splitResource(recurso: string): { tipo: string; clave: string; valor: string } {
  const at = recurso.indexOf(':');
  const clave = at > 0 ? recurso.slice(0, at).toLowerCase() : '';
  const valor = at > 0 ? recurso.slice(at + 1) : recurso;
  return { tipo: RESOURCE_LABEL[clave] ?? (clave ? readable(clave) : ''), clave, valor };
}

export const RESULT_LABEL: Record<string, string> = { EXITO: 'Éxito', FALLO: 'Fallo' };
export const KIND_LABEL: Record<string, string> = { SIMULACRO: 'Simulacro', REAL: 'Evento real' };

/** Claves de los desgloses de MS08 (estado de check-in, prioridad, sin dato) en español. */
const BUCKET_LABEL: Record<string, string> = {
  SAFE: 'A salvo', A_SALVO: 'A salvo', NEEDS_ASSISTANCE: 'Necesita asistencia', NECESITA_AYUDA: 'Necesita ayuda',
  OFF_CAMPUS: 'Fuera del campus', NOT_ON_CAMPUS: 'Fuera del campus', NEEDS_HELP: 'Necesita ayuda', EVACUATING: 'Evacuando',
  SIN_ESTADO: 'Sin estado', SIN_PUNTO: 'Sin punto de encuentro', SIN_PRIORIDAD: 'Sin prioridad',
  ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja', CRITICA: 'Crítica',
};

export function bucketLabel(key: string): string {
  if (BUCKET_LABEL[key.toUpperCase()]) return BUCKET_LABEL[key.toUpperCase()];
  // Solo los códigos (MAYÚSCULAS_CON_GUION_BAJO) se vuelven legibles; los nombres (un punto de encuentro) quedan igual
  if (!/^[A-Z0-9_]+$/.test(key)) return key;
  const text = key.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const formatCount = (value: number): string => value.toLocaleString('es-CO');

/** Porcentaje de 0 a 100 con un decimal; "—" si MS08 no tuvo con qué calcularlo. */
export const formatPercent = (value: number | null): string =>
  (value == null ? '—' : `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`);

/** Tiempo promedio en segundos; "—" si no hay muestras. */
export const formatSeconds = (value: number | null): string => (value == null ? '—' : formatDuration(value));
