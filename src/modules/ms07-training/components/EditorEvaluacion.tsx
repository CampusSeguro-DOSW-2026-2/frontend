import { Mensaje } from '../../../shared/components/Mensaje';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, errorMessage } from '../../../shared/services/http';
import type { Categoria, Evaluacion, EvaluacionRequest } from '../types';

interface OpcionEditable { text: string; correct: boolean }
interface PreguntaEditable { statement: string; options: OpcionEditable[] }

const MAX_PREGUNTAS = 50;
const MAX_OPCIONES = 10;
const opcionVacia = (correct = false): OpcionEditable => ({ text: '', correct });
const preguntaVacia = (): PreguntaEditable => ({ statement: '', options: [opcionVacia(true), opcionVacia()] });

/** Revisa en el navegador las mismas reglas de MS07; el servidor las vuelve a validar. */
function validar(titulo: string, tema: string, categoria: string, preguntas: PreguntaEditable[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (!titulo.trim()) e.title = 'El título es obligatorio.';
  else if (titulo.trim().length > 150) e.title = 'El título debe tener máximo 150 caracteres.';
  if (!tema.trim()) e.topic = 'El tema es obligatorio.';
  else if (tema.trim().length > 150) e.topic = 'El tema debe tener máximo 150 caracteres.';
  if (!categoria) e.categoryId = 'La categoría es obligatoria.';
  if (preguntas.length === 0) e.questions = 'La evaluación debe tener al menos una pregunta.';
  preguntas.forEach((p, i) => {
    const n = i + 1;
    if (!p.statement.trim()) e[`q${i}`] = `Escriba el enunciado de la pregunta ${n}.`;
    else if (p.statement.trim().length > 500) e[`q${i}`] = `El enunciado de la pregunta ${n} debe tener máximo 500 caracteres.`;
    else if (p.options.length < 2) e[`q${i}`] = `La pregunta ${n} debe tener al menos dos opciones.`;
    else if (p.options.some((o) => !o.text.trim())) e[`q${i}`] = `Escriba el texto de todas las opciones de la pregunta ${n}.`;
    else if (p.options.some((o) => o.text.trim().length > 300)) e[`q${i}`] = `Las opciones de la pregunta ${n} deben tener máximo 300 caracteres.`;
    else if (p.options.filter((o) => o.correct).length !== 1) e[`q${i}`] = `Marque una opción correcta en la pregunta ${n}.`;
  });
  return e;
}

/**
 * Editor de una evaluación (RF-14): título, tema, categoría y preguntas con sus opciones, una de ellas correcta.
 * Al modificar, las preguntas se reemplazan completas; MS07 responde 409 si la evaluación ya tiene intentos.
 */
export default function EditorEvaluacion({ inicial, categorias, onGuardar, onCancelar }: {
  inicial?: Evaluacion;
  categorias: Categoria[];
  onGuardar: (datos: EvaluacionRequest) => Promise<void>;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.title ?? '');
  const [tema, setTema] = useState(inicial?.topic ?? '');
  const [categoria, setCategoria] = useState(inicial?.categoryId ?? '');
  const [preguntas, setPreguntas] = useState<PreguntaEditable[]>(
    inicial
      ? inicial.questions.map((p) => ({ statement: p.statement, options: p.options.map((o) => ({ text: o.text, correct: !!o.correct })) }))
      : [preguntaVacia()],
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Se ofrece la categoría actual aunque esté inactiva: MS07 permite conservarla al modificar
  const opcionesCategoria = categorias.filter((c) => c.status === 'ACTIVO' || c.id === inicial?.categoryId);

  // El error de un campo desaparece en cuanto se corrige
  const limpiar = (campo: string) => setErrores((e) => {
    if (!e[campo]) return e;
    const { [campo]: _quitado, ...resto } = e;
    return resto;
  });

  const cambiarPregunta = (i: number, cambio: Partial<PreguntaEditable>) => {
    limpiar(`q${i}`);
    setPreguntas((ps) => ps.map((p, j) => (j === i ? { ...p, ...cambio } : p)));
  };
  const cambiarOpcion = (i: number, k: number, cambio: Partial<OpcionEditable>) => {
    limpiar(`q${i}`);
    setPreguntas((ps) => ps.map((p, j) => (j !== i ? p : {
      ...p,
      options: p.options.map((o, m) => {
        if (cambio.correct) return { ...o, correct: m === k };
        return m === k ? { ...o, ...cambio } : o;
      }),
    })));
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const encontrados = validar(titulo, tema, categoria, preguntas);
    setErrores(encontrados);
    setGeneral('');
    if (Object.keys(encontrados).length > 0) return;
    setGuardando(true);
    try {
      await onGuardar({
        title: titulo.trim(),
        topic: tema.trim(),
        categoryId: categoria,
        questions: preguntas.map((p) => ({
          statement: p.statement.trim(),
          options: p.options.map((o) => ({ text: o.text.trim(), correct: o.correct })),
        })),
      });
    } catch (err) {
      if (err instanceof ApiError) setErrores({ ...err.fields } as Record<string, string>);
      setGeneral(errorMessage(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="evl-editor" onSubmit={enviar} noValidate aria-label={inicial ? 'Editar evaluación' : 'Nueva evaluación'}>
      <h2 className="title sm22">{inicial ? 'Editar evaluación' : 'Nueva evaluación'}</h2>
      <div className="two">
        <div className="field">
          <label htmlFor="evl-titulo">Título</label>
          <div className="input"><input id="evl-titulo" value={titulo} maxLength={150} placeholder="Evacuación básica"
            onChange={(e) => { setTitulo(e.target.value); limpiar('title'); }} /></div>
          {errores.title && <span className="error">{errores.title}</span>}
        </div>
        <div className="field">
          <label htmlFor="evl-tema">Tema</label>
          <div className="input"><input id="evl-tema" value={tema} maxLength={150} placeholder="Rutas de salida"
            onChange={(e) => { setTema(e.target.value); limpiar('topic'); }} /></div>
          {errores.topic && <span className="error">{errores.topic}</span>}
        </div>
      </div>
      <div className="field">
        <label htmlFor="evl-categoria">Categoría</label>
        <div className="input">
          <select id="evl-categoria" value={categoria} onChange={(e) => { setCategoria(e.target.value); limpiar('categoryId'); }}>
            <option value="">Seleccione una categoría</option>
            {opcionesCategoria.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.status === 'INACTIVO' ? ' (inactiva)' : ''}</option>
            ))}
          </select>
        </div>
        {errores.categoryId && <span className="error">{errores.categoryId}</span>}
      </div>

      {preguntas.map((p, i) => (
        <section key={i} className="evl-ed-pregunta" aria-label={`Pregunta ${i + 1}`}>
          <div className="evl-ed-cab">
            <label htmlFor={`evl-q${i}`}>Pregunta {i + 1}</label>
            {preguntas.length > 1 && (
              <button type="button" className="evl-mini peligro"
                onClick={() => setPreguntas((ps) => ps.filter((_, j) => j !== i))}>Quitar pregunta</button>
            )}
          </div>
          <div className="input"><input id={`evl-q${i}`} value={p.statement} maxLength={500} placeholder="¿Por dónde se debe salir?"
            onChange={(e) => cambiarPregunta(i, { statement: e.target.value })} /></div>
          {p.options.map((o, k) => (
            <div key={k} className="evl-ed-opcion">
              <div className="input"><input aria-label={`Opción ${k + 1} de la pregunta ${i + 1}`} value={o.text} maxLength={300}
                placeholder={`Opción ${k + 1}`} onChange={(e) => cambiarOpcion(i, k, { text: e.target.value })} /></div>
              <label>
                <input type="radio" name={`correcta-${i}`} checked={o.correct} onChange={() => cambiarOpcion(i, k, { correct: true })} />
                Correcta
              </label>
              {p.options.length > 2 && (
                <button type="button" className="evl-mini" aria-label={`Quitar opción ${k + 1}`}
                  onClick={() => cambiarPregunta(i, { options: p.options.filter((_, m) => m !== k) })}>Quitar opción</button>
              )}
            </div>
          ))}
          {p.options.length < MAX_OPCIONES && (
            <button type="button" className="evl-mini" onClick={() => cambiarPregunta(i, { options: [...p.options, opcionVacia()] })}>
              Agregar opción
            </button>
          )}
          {errores[`q${i}`] && <span className="error">{errores[`q${i}`]}</span>}
        </section>
      ))}
      {preguntas.length < MAX_PREGUNTAS && (
        <button type="button" className="btn white" onClick={() => setPreguntas((ps) => [...ps, preguntaVacia()])}>
          Agregar pregunta
        </button>
      )}
      {errores.questions && <span className="error">{errores.questions}</span>}

      {general && <Mensaje tono="error">{general}</Mensaje>}
      <div className="evl-acciones">
        <button type="submit" className="btn red" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar evaluación'}</button>
        <button type="button" className="btn white" onClick={onCancelar} disabled={guardando}>Cancelar</button>
      </div>
    </form>
  );
}
