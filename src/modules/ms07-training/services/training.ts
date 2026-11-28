import { request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type {
  BorradorEvaluacion, BorradorRequest, Categoria, CategoriaRequest, Contenido, ContenidoRequest, ContenidoResumen,
  Evaluacion, EvaluacionRequest, EvaluacionResumen, Intento, Pagina, Progreso, Respuesta, RespuestaTutor,
} from '../types';

/**
 * Cliente de MS07 (Formación). Todo pasa por el API Gateway con el JWT de la sesión; MS07 responde los errores con el
 * ErrorResponse de los Estándares y los mensajes ya en español, así que se muestran tal cual.
 */
const BASE = '/api/v1/training';
const TUTOR = '/api/v1/tutor';
const enc = encodeURIComponent;

/** Campo del contrato → campo del formulario, para marcar los errores 400 por campo del editor. */
const CAMPOS_EVALUACION: Record<string, string> = { title: 'title', topic: 'topic', categoryId: 'categoryId' };
const CAMPOS_CONTENIDO: Record<string, string> = { title: 'title', body: 'body', categoryId: 'categoryId' };
const CAMPOS_CATEGORIA: Record<string, string> = { name: 'name', description: 'description' };

function consulta(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
  const texto = q.toString();
  return texto ? `?${texto}` : '';
}

export const trainingApi = {
  /** Categorías ordenadas por nombre (hasta 100: son pocas); con `includeInactive` también las inactivas (ADMIN). */
  async categorias(session: Session, includeInactive = false): Promise<Categoria[]> {
    const ruta = `${BASE}/categories${consulta({ size: 100, includeInactive: includeInactive || undefined })}`;
    const data = (await request(ruta, { session })) as Pagina<Categoria>;
    return data?.contenido ?? [];
  },

  async crearCategoria(session: Session, cuerpo: CategoriaRequest): Promise<Categoria> {
    return (await request(`${BASE}/categories`, {
      method: 'POST', body: cuerpo, session, fields: CAMPOS_CATEGORIA,
    })) as Categoria;
  },

  async modificarCategoria(session: Session, id: string, cuerpo: CategoriaRequest): Promise<Categoria> {
    return (await request(`${BASE}/categories/${enc(id)}`, {
      method: 'PUT', body: cuerpo, session, fields: CAMPOS_CATEGORIA,
    })) as Categoria;
  },

  async inactivarCategoria(session: Session, id: string): Promise<Categoria> {
    return (await request(`${BASE}/categories/${enc(id)}/deactivate`, { method: 'PATCH', session })) as Categoria;
  },

  async reactivarCategoria(session: Session, id: string): Promise<Categoria> {
    return (await request(`${BASE}/categories/${enc(id)}/reactivate`, { method: 'PATCH', session })) as Categoria;
  },

  /**
   * Contenidos activos (sin el cuerpo). Un contenido activo se ve aunque su categoría esté inactiva (RF-12 regla 2).
   * Con `includeInactive` también los inactivos: solo aplica con permiso de administración.
   */
  async contenidos(
    session: Session,
    filtro: { categoryId?: string; includeInactive?: boolean; page?: number; size?: number } = {},
  ): Promise<Pagina<ContenidoResumen>> {
    return (await request(`${BASE}/contents${consulta(filtro)}`, { session })) as Pagina<ContenidoResumen>;
  },

  /** Contenido completo. Un contenido inactivo responde 404 a la comunidad. */
  async contenido(session: Session, id: string): Promise<Contenido> {
    return (await request(`${BASE}/contents/${enc(id)}`, { session })) as Contenido;
  },

  async crearContenido(session: Session, cuerpo: ContenidoRequest): Promise<Contenido> {
    return (await request(`${BASE}/contents`, {
      method: 'POST', body: cuerpo, session, fields: CAMPOS_CONTENIDO,
    })) as Contenido;
  },

  async modificarContenido(session: Session, id: string, cuerpo: ContenidoRequest): Promise<Contenido> {
    return (await request(`${BASE}/contents/${enc(id)}`, {
      method: 'PUT', body: cuerpo, session, fields: CAMPOS_CONTENIDO,
    })) as Contenido;
  },

  async inactivarContenido(session: Session, id: string): Promise<Contenido> {
    return (await request(`${BASE}/contents/${enc(id)}/deactivate`, { method: 'PATCH', session })) as Contenido;
  },

  async reactivarContenido(session: Session, id: string): Promise<Contenido> {
    return (await request(`${BASE}/contents/${enc(id)}/reactivate`, { method: 'PATCH', session })) as Contenido;
  },

  /** Registra que el usuario abrió el contenido (progreso, RF-13). Un solo registro por usuario y contenido. */
  async registrarVista(session: Session, id: string): Promise<void> {
    await request(`${BASE}/contents/${enc(id)}/views`, { method: 'POST', session });
  },

  /** Evaluaciones activas; con `includeInactive` también las inactivas (solo para quien administra). */
  async evaluaciones(
    session: Session,
    filtro: { categoryId?: string; includeInactive?: boolean; page?: number; size?: number } = {},
  ): Promise<Pagina<EvaluacionResumen>> {
    return (await request(`${BASE}/evaluations${consulta(filtro)}`, { session })) as Pagina<EvaluacionResumen>;
  },

  /** Evaluación con sus preguntas. Sin permiso de administración no trae cuál opción es la correcta. */
  async evaluacion(session: Session, id: string): Promise<Evaluacion> {
    return (await request(`${BASE}/evaluations/${enc(id)}`, { session })) as Evaluacion;
  },

  async crear(session: Session, cuerpo: EvaluacionRequest): Promise<Evaluacion> {
    return (await request(`${BASE}/evaluations`, {
      method: 'POST', body: cuerpo, session, fields: CAMPOS_EVALUACION,
    })) as Evaluacion;
  },

  async modificar(session: Session, id: string, cuerpo: EvaluacionRequest): Promise<Evaluacion> {
    return (await request(`${BASE}/evaluations/${enc(id)}`, {
      method: 'PUT', body: cuerpo, session, fields: CAMPOS_EVALUACION,
    })) as Evaluacion;
  },

  async inactivar(session: Session, id: string): Promise<Evaluacion> {
    return (await request(`${BASE}/evaluations/${enc(id)}/deactivate`, { method: 'PATCH', session })) as Evaluacion;
  },

  async reactivar(session: Session, id: string): Promise<Evaluacion> {
    return (await request(`${BASE}/evaluations/${enc(id)}/reactivate`, { method: 'PATCH', session })) as Evaluacion;
  },

  /**
   * Pide a la IA un borrador de evaluación con los contenidos activos de la categoría (RF-14). MS07 responde 202 con el
   * borrador EN_PROCESO; luego se consulta con `borrador` hasta que quede LISTO o FALLIDO. Nada se guarda solo.
   */
  async pedirBorrador(session: Session, cuerpo: BorradorRequest): Promise<BorradorEvaluacion> {
    return (await request(`${BASE}/evaluation-drafts`, { method: 'POST', body: cuerpo, session })) as BorradorEvaluacion;
  },

  /** Estado del borrador. Solo lo ve quien lo pidió; vence a los 30 minutos (404). */
  async borrador(session: Session, id: string): Promise<BorradorEvaluacion> {
    return (await request(`${BASE}/evaluation-drafts/${enc(id)}`, { session })) as BorradorEvaluacion;
  },

  /**
   * Pregunta al Tutor CampusSeguro (RF-15). Responde solo con los contenidos activos; si no tiene información,
   * `sufficient` llega en false. Si la IA no responde a tiempo, MS07 contesta 503 con el mensaje ya en español.
   */
  async preguntarTutor(session: Session, question: string): Promise<RespuestaTutor> {
    return (await request(`${TUTOR}/questions`, { method: 'POST', body: { question }, session })) as RespuestaTutor;
  },

  /** Presenta la evaluación: una opción por pregunta. Responde el puntaje y la corrección. */
  async presentar(session: Session, id: string, answers: Respuesta[]): Promise<Intento> {
    return (await request(`${BASE}/evaluations/${enc(id)}/attempts`, {
      method: 'POST', body: { answers }, session,
    })) as Intento;
  },

  /** Progreso propio: contenidos consultados y mejor resultado de cada evaluación (RF-13). */
  async progreso(session: Session): Promise<Progreso> {
    return (await request(`${BASE}/progress/me`, { session })) as Progreso;
  },

  /** Todos los contenidos activos (recorre las páginas): sirven para calcular el avance por categoría. */
  async todosLosContenidos(session: Session): Promise<ContenidoResumen[]> {
    const todos: ContenidoResumen[] = [];
    for (let page = 0; ; page++) {
      const pagina = await this.contenidos(session, { page, size: 100 });
      todos.push(...pagina.contenido);
      if (page + 1 >= pagina.total_paginas) return todos;
    }
  },
};
