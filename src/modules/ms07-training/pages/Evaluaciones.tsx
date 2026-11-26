import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { FiltroCategorias } from '../components/FiltroCategorias';
import { trainingApi } from '../services/training';
import type { Categoria, EvaluacionResumen, Pagina } from '../types';
import '../styles/evaluaciones.css';

const TAMANO_PAGINA = 20;

/**
 * RF-14 Evaluaciones por categoría (ms07:quiz:take). Solo aparecen las evaluaciones activas, aunque su categoría
 * esté inactiva; el filtro solo ofrece las categorías activas.
 */
export default function Evaluaciones({ session }: { session: Session }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoria, setCategoria] = useState('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<Pagina<EvaluacionResumen> | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    trainingApi.categorias(session)
      .then((lista) => { if (vigente) setCategorias(lista); })
      .catch(() => { if (vigente) setCategorias([]); });
    return () => { vigente = false; };
  }, [session]);

  useEffect(() => {
    let vigente = true;
    trainingApi.evaluaciones(session, { categoryId: categoria || undefined, page: pagina, size: TAMANO_PAGINA })
      .then((p) => { if (vigente) setDatos(p); })
      .catch((err: unknown) => { if (vigente) setError(errorMessage(err)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [session, categoria, pagina, intento]);

  const iniciarCarga = () => { setCargando(true); setError(''); };
  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.name ?? '';
  const evaluaciones = datos?.contenido ?? [];

  return (
    <>
      <PageHeader badge="APRENDIZAJE" title="Evaluaciones" subtitle="Ponga a prueba lo que sabe sobre prevención y evacuación" />
      <main className="content">
        {categorias.length > 0 && (
          <FiltroCategorias categorias={categorias} elegida={categoria}
            onElegir={(id) => { setCategoria(id); setPagina(0); iniciarCarga(); }} />
        )}

        {error && (
          <>
            <Mensaje tono="error">{error}</Mensaje>
            <button type="button" className="btn white" onClick={() => { setIntento((n) => n + 1); iniciarCarga(); }}>
              Intentar de nuevo
            </button>
          </>
        )}
        {cargando && !datos && !error && <Cargando texto="Consultando las evaluaciones…" />}
        {datos && !error && evaluaciones.length === 0 && (
          categoria
          ? <EstadoVacio titulo="No hay evaluaciones en esta categoría">Elija otra o «Todas».</EstadoVacio>
          : <EstadoVacio titulo="Todavía no hay evaluaciones disponibles" />
        )}

        {!error && evaluaciones.length > 0 && (
          <ul className="evl-lista" aria-label="Evaluaciones" aria-busy={cargando}>
            {evaluaciones.map((e) => (
              <li key={e.id}>
                <a className="evl-card" href={`#/evaluaciones/${encodeURIComponent(e.id)}`}>
                  {nombreCategoria(e.categoryId) && <span className="tag">{nombreCategoria(e.categoryId).toUpperCase()}</span>}
                  <h3>{e.title}</h3>
                  <p>Tema: {e.topic}</p>
                </a>
              </li>
            ))}
          </ul>
        )}

        {!error && datos && datos.total_paginas > 1 && (
          <div className="evl-pager">
            <span>Página {datos.page + 1} de {datos.total_paginas} · {datos.total_elementos} evaluaciones</span>
            <div>
              <button type="button" className="pill" disabled={cargando || pagina === 0}
                onClick={() => { setPagina((p) => p - 1); iniciarCarga(); }}>Anterior</button>
              <button type="button" className="pill" disabled={cargando || pagina + 1 >= datos.total_paginas}
                onClick={() => { setPagina((p) => p + 1); iniciarCarga(); }}>Siguiente</button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
