import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { trainingApi } from '../services/training';
import type { Categoria, ContenidoResumen, Progreso } from '../types';
import { fechaCorta } from '../utils/formato';
import '../styles/progreso.css';

interface AvanceCategoria {
  id: string;
  nombre: string;
  vistos: number;
  total: number;
  promedio: number | null;
}

/**
 * Avance por categoría: contenidos activos vistos sobre el total de contenidos activos de la categoría, y el promedio de
 * los mejores puntajes de sus evaluaciones. Solo aparecen las categorías con contenidos o con algún resultado.
 */
function avancePorCategoria(progreso: Progreso, contenidos: ContenidoResumen[], categorias: Categoria[]): AvanceCategoria[] {
  const vistos = new Set(progreso.contents.filter((c) => c.available).map((c) => c.contentId));
  const ids = new Set([...contenidos.map((c) => c.categoryId), ...progreso.evaluations.map((e) => e.categoryId)]);
  return [...ids].map((id) => {
    const deLaCategoria = contenidos.filter((c) => c.categoryId === id);
    const puntajes = progreso.evaluations.filter((e) => e.categoryId === id).map((e) => e.bestScore);
    return {
      id,
      nombre: categorias.find((c) => c.id === id)?.name ?? 'Categoría no disponible',
      vistos: deLaCategoria.filter((c) => vistos.has(c.id)).length,
      total: deLaCategoria.length,
      promedio: puntajes.length > 0 ? Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length) : null,
    };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

const porcentaje = (vistos: number, total: number) => (total === 0 ? 0 : Math.round((vistos * 100) / total));

/** RF-13 Mi progreso (ms07:quiz:take): solo los datos propios del usuario. */
export default function MiProgreso({ session }: { session: Session }) {
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [contenidos, setContenidos] = useState<ContenidoResumen[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    trainingApi.progreso(session)
      .then((p) => { if (vigente) setProgreso(p); })
      .catch((err: unknown) => { if (vigente) setError(errorMessage(err)); });
    // Los nombres y totales son complementarios: si fallan, el progreso se muestra igual
    trainingApi.categorias(session).then((c) => { if (vigente) setCategorias(c); }).catch(() => {});
    trainingApi.todosLosContenidos(session).then((c) => { if (vigente) setContenidos(c); }).catch(() => {});
    return () => { vigente = false; };
  }, [session, intento]);

  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.name ?? '';
  const cabecera = <PageHeader badge="APRENDIZAJE" title="Mi progreso" subtitle="Lo que ha consultado y sus mejores resultados" />;

  if (!progreso) {
    return (
      <>
        {cabecera}
        <main className="content">
          {error ? (
            <>
              <p className="notice err" role="alert">{error}</p>
              <button type="button" className="btn white" onClick={() => { setError(''); setIntento((n) => n + 1); }}>
                Intentar de nuevo
              </button>
            </>
          ) : <p className="notice" role="status">Consultando su progreso…</p>}
        </main>
      </>
    );
  }

  const sinProgreso = progreso.contents.length === 0 && progreso.evaluations.length === 0;
  const avance = avancePorCategoria(progreso, contenidos, categorias);

  return (
    <>
      {cabecera}
      <main className="content">
        {sinProgreso ? (
          <div className="pr-vacio" role="status">
            <p>Todavía no hay progreso.</p>
            <p>Consulte un contenido en <a href="#/aprendizaje">Aprendizaje</a> o presente una <a href="#/evaluaciones">evaluación</a>.</p>
          </div>
        ) : (
          <>
            {avance.length > 0 && (
              <section className="pr-seccion" aria-labelledby="pr-avance">
                <h2 id="pr-avance" className="title sm22">Avance por categoría</h2>
                <ul className="pr-categorias">
                  {avance.map((a) => (
                    <li key={a.id} className="pr-categoria">
                      <h3>{a.nombre}</h3>
                      {a.total > 0 && (
                        <>
                          <div className="pr-barra" role="progressbar" aria-label={`Contenidos vistos de ${a.nombre}`}
                            aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje(a.vistos, a.total)}>
                            <span style={{ width: `${porcentaje(a.vistos, a.total)}%` }} />
                          </div>
                          <p>{porcentaje(a.vistos, a.total)}% · {a.vistos} de {a.total} contenidos vistos</p>
                        </>
                      )}
                      <p>{a.promedio === null ? 'Sin evaluaciones presentadas' : `Promedio de sus mejores puntajes: ${a.promedio}%`}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="pr-seccion" aria-labelledby="pr-evaluaciones">
              <h2 id="pr-evaluaciones" className="title sm22">Evaluaciones</h2>
              {progreso.evaluations.length === 0 ? (
                <p className="pr-nota">Aún no ha presentado evaluaciones.</p>
              ) : (
                <table className="pr-tabla">
                  <thead>
                    <tr><th>Evaluación</th><th>Tema</th><th>Mejor puntaje</th><th>Intentos</th><th>Fecha</th></tr>
                  </thead>
                  <tbody>
                    {progreso.evaluations.map((e) => (
                      <tr key={e.evaluationId}>
                        <td>
                          {e.available
                            ? <a href={`#/evaluaciones/${encodeURIComponent(e.evaluationId)}`}>{e.title}</a>
                            : <>{e.title} <span className="pr-no-disponible">No disponible</span></>}
                          {nombreCategoria(e.categoryId) && <small>{nombreCategoria(e.categoryId)}</small>}
                        </td>
                        <td>{e.topic}</td>
                        <td><b className="pr-puntaje">{e.bestScore}%</b></td>
                        <td>{e.attempts}</td>
                        <td>{fechaCorta(e.attemptedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="pr-seccion" aria-labelledby="pr-contenidos">
              <h2 id="pr-contenidos" className="title sm22">Contenidos consultados</h2>
              {progreso.contents.length === 0 ? (
                <p className="pr-nota">Aún no ha consultado contenidos.</p>
              ) : (
                <ul className="pr-contenidos">
                  {progreso.contents.map((c) => (
                    <li key={c.contentId}>
                      {c.available
                        ? <a href={`#/aprendizaje/${encodeURIComponent(c.contentId)}`}>{c.title}</a>
                        : <span>{c.title} <span className="pr-no-disponible">No disponible</span></span>}
                      <small>Última consulta: {fechaCorta(c.lastViewedAt)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
