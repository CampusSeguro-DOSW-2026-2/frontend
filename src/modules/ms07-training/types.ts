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
