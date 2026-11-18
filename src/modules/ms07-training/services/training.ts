import { request } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import type {
  Categoria, Evaluacion, EvaluacionRequest, EvaluacionResumen, Intento, Pagina, Respuesta,
} from '../types';

/**
 * Cliente de MS07 (Formación). Todo pasa por el API Gateway con el JWT de la sesión; MS07 responde los errores con el
 * ErrorResponse de los Estándares y los mensajes ya en español, así que se muestran tal cual.
 */
const BASE = '/api/v1/training';
const enc = encodeURIComponent;

/** Campo del contrato → campo del formulario, para marcar los errores 400 por campo del editor. */
const CAMPOS_EVALUACION: Record<string, string> = { title: 'title', topic: 'topic', categoryId: 'categoryId' };

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

  /** Presenta la evaluación: una opción por pregunta. Responde el puntaje y la corrección. */
  async presentar(session: Session, id: string, answers: Respuesta[]): Promise<Intento> {
    return (await request(`${BASE}/evaluations/${enc(id)}/attempts`, {
      method: 'POST', body: { answers }, session,
    })) as Intento;
  },
};
