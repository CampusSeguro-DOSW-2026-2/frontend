/** Estado de categorías, contenidos y evaluaciones de MS07. */
export type Estado = 'ACTIVO' | 'INACTIVO';

/** Página de un listado de MS07: paginación de los Estándares, con `page` desde 0. */
export interface Pagina<T> {
  contenido: T[];
  page: number;
  size: number;
  total_elementos: number;
  total_paginas: number;
}

/** Categoría de contenidos y evaluaciones (GET /api/v1/training/categories). */
export interface Categoria {
  id: string;
  name: string;
  description: string | null;
  status: Estado;
}

/** Cuerpo para crear o modificar una categoría. */
export interface CategoriaRequest {
  name: string;
  description: string | null;
}

/** Contenido en un listado (GET /api/v1/training/contents): no trae el cuerpo. */
export interface ContenidoResumen {
  id: string;
  title: string;
  categoryId: string;
  status: Estado;
  updatedAt: string;
}

/** Contenido completo (GET /api/v1/training/contents/{id}). */
export interface Contenido extends Omit<ContenidoResumen, 'updatedAt'> {
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo para crear o modificar un contenido. */
export interface ContenidoRequest {
  title: string;
  body: string;
  categoryId: string;
}

/** Evaluación en un listado. */
export interface EvaluacionResumen {
  id: string;
  title: string;
  topic: string;
  categoryId: string;
  status: Estado;
  updatedAt: string;
}

/** Opción de una pregunta. `correct` solo llega para quien administra evaluaciones. */
export interface Opcion {
  id: string;
  position: number;
  text: string;
  correct?: boolean;
}

export interface Pregunta {
  id: string;
  position: number;
  statement: string;
  options: Opcion[];
}

export interface Evaluacion extends Omit<EvaluacionResumen, 'updatedAt'> {
  questions: Pregunta[];
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo para crear o modificar una evaluación. Las preguntas se reemplazan completas al modificar. */
export interface EvaluacionRequest {
  title: string;
  topic: string;
  categoryId: string;
  questions: { statement: string; options: { text: string; correct: boolean }[] }[];
}

export interface Respuesta {
  questionId: string;
  optionId: string;
}

/** Resultado de presentar una evaluación, con la corrección de cada respuesta. */
export interface Intento {
  id: string;
  evaluationId: string;
  topic: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  attemptedAt: string;
  answers: { questionId: string; optionId: string; correct: boolean; correctOptionId: string }[];
}

/** Contenido que el tutor usó para responder: se enlaza a su detalle en el centro de aprendizaje. */
export interface FuenteTutor {
  id: string;
  title: string;
}

/**
 * Respuesta del tutor (POST /api/v1/tutor/questions). Con `sufficient` en false el tutor no tuvo información y
 * `answer` remite al protocolo oficial de emergencias; entonces no hay fuentes.
 */
export interface RespuestaTutor {
  answer: string;
  sufficient: boolean;
  sources: FuenteTutor[];
}

/** Progreso del usuario (GET /api/v1/training/progress/me). `available` es false si se inactivó después. */
export interface Progreso {
  contents: {
    contentId: string;
    title: string;
    categoryId: string;
    firstViewedAt: string;
    lastViewedAt: string;
    available: boolean;
  }[];
  /** Mejor intento de cada evaluación: su puntaje, el tema con que se presentó y su fecha. */
  evaluations: {
    evaluationId: string;
    title: string;
    categoryId: string;
    topic: string;
    bestScore: number;
    attemptedAt: string;
    attempts: number;
    available: boolean;
  }[];
}
