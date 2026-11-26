import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { trainingApi } from '../services/training';
import type { Evaluacion, Intento } from '../types';
import '../styles/evaluaciones.css';

/**
 * RF-14 Presentar una evaluación: una opción por pregunta. Al enviar, MS07 registra el intento con su puntaje, tema y
 * fecha y devuelve la corrección, que se muestra sobre las mismas preguntas. Se puede presentar varias veces.
 */
export default function PresentarEvaluacion({ session, id }: { session: Session; id: string }) {
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [elegidas, setElegidas] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Intento | null>(null);
  const [error, setError] = useState('');
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    trainingApi.evaluacion(session, id)
      .then((e) => { if (vigente) setEvaluacion(e); })
      .catch((err: unknown) => { if (vigente) setError(errorMessage(err)); });
    return () => { vigente = false; };
  }, [session, id]);

  const volver = <a className="evl-volver" href="#/evaluaciones">← Evaluaciones</a>;

  if (error || !evaluacion) {
    return (
      <>
        <PageHeader badge="APRENDIZAJE" title="Evaluación" subtitle="" context={volver} />
        <main className="content">
          {error
            ? <p className="notice err" role="alert">{error}</p>
            : <p className="notice" role="status">Cargando la evaluación…</p>}
        </main>
      </>
    );
  }

  const preguntas = evaluacion.questions;
  const faltan = preguntas.filter((p) => !elegidas[p.id]).length;
  const correccion = new Map(resultado?.answers.map((a) => [a.questionId, a]) ?? []);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (faltan > 0 || enviando) return;
    setEnviando(true);
    setErrorEnvio('');
    try {
      const answers = preguntas.map((p) => ({ questionId: p.id, optionId: elegidas[p.id] }));
      setResultado(await trainingApi.presentar(session, id, answers));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorEnvio(errorMessage(err));
    } finally {
      setEnviando(false);
    }
  };

  const repetir = () => { setResultado(null); setElegidas({}); };

  return (
    <>
      <PageHeader badge="APRENDIZAJE" title={evaluacion.title} subtitle={`Tema: ${evaluacion.topic}`} context={volver} />
      <main className="content">
        {resultado && (
          <section className="evl-resultado" aria-live="polite">
            <span className="evl-puntaje">{resultado.score}%</span>
            <div>
              <h2 className="title sm22">
                {resultado.correctAnswers} de {resultado.totalQuestions} respuestas correctas
              </h2>
              <p>Abajo puede ver la corrección de cada pregunta.</p>
            </div>
          </section>
        )}

        <form onSubmit={enviar} noValidate>
          <ol className="evl-preguntas">
            {preguntas.map((p) => {
              const c = correccion.get(p.id);
              return (
                <li key={p.id} className={`evl-pregunta${c ? (c.correct ? ' ok' : ' mal') : ''}`}>
                  <fieldset disabled={!!resultado}>
                    <legend>{p.position}. {p.statement}</legend>
                    {p.options.map((o) => {
                      const esCorrecta = c?.correctOptionId === o.id;
                      const esErrada = c && !c.correct && c.optionId === o.id;
                      return (
                        <label key={o.id} className={`evl-opcion${esCorrecta ? ' ok' : ''}${esErrada ? ' mal' : ''}`}>
                          <input type="radio" name={p.id} value={o.id} checked={elegidas[p.id] === o.id}
                            onChange={() => setElegidas((prev) => ({ ...prev, [p.id]: o.id }))} />
                          {o.text}
                          {esCorrecta && <small>Respuesta correcta</small>}
                          {esErrada && <small>Su respuesta</small>}
                        </label>
                      );
                    })}
                  </fieldset>
                </li>
              );
            })}
          </ol>

          {errorEnvio && <p className="notice err" role="alert">{errorEnvio}</p>}

          <div className="evl-acciones evl-enviar">
            {resultado ? (
              <>
                <button type="button" className="btn red" onClick={repetir}>Presentar de nuevo</button>
                <a className="btn white" href="#/evaluaciones">Ver otras evaluaciones</a>
              </>
            ) : (
              <>
                <button type="submit" className="btn red" disabled={faltan > 0 || enviando}>
                  {enviando ? 'Enviando…' : 'Enviar respuestas'}
                </button>
                {faltan > 0 && <p className="notice" role="status">Faltan {faltan} {faltan === 1 ? 'pregunta' : 'preguntas'} por responder.</p>}
              </>
            )}
          </div>
        </form>
      </main>
    </>
  );
}
