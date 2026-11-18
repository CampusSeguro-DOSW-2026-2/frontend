import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { trainingApi } from '../services/training';
import type { Categoria, ContenidoResumen, Pagina } from '../types';
import { fechaCorta } from '../utils/formato';
import '../styles/aprendizaje.css';

const TAMANO_PAGINA = 20;

/**
 * RF-12 Centro de aprendizaje: contenidos preventivos activos, con filtro por categoría. Un contenido activo se ve
 * aunque su categoría esté inactiva (aparece en "Todos"); el filtro solo ofrece las categorías activas.
 */
export default function Aprendizaje({ session }: { session: Session }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoria, setCategoria] = useState('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<Pagina<ContenidoResumen> | null>(null);
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
    trainingApi.contenidos(session, { categoryId: categoria || undefined, page: pagina, size: TAMANO_PAGINA })
      .then((p) => { if (vigente) setDatos(p); })
      .catch((err: unknown) => { if (vigente) setError(errorMessage(err)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [session, categoria, pagina, intento]);

  const iniciarCarga = () => { setCargando(true); setError(''); };
  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.name ?? '';
  const contenidos = datos?.contenido ?? [];

  return (
    <>
      <PageHeader badge="APRENDIZAJE" title="Centro de aprendizaje" subtitle="Aprenda a prevenir y a actuar ante una emergencia" />
      <main className="content">
        {categorias.length > 0 && (
          <div className="pills" role="group" aria-label="Filtrar por categoría">
            {[{ id: '', name: 'Todas' }, ...categorias].map((c) => (
              <button key={c.id || 'todas'} type="button" className="pill" aria-pressed={categoria === c.id}
                onClick={() => { setCategoria(c.id); setPagina(0); iniciarCarga(); }}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <>
            <p className="notice err" role="alert">{error}</p>
            <button type="button" className="btn white" onClick={() => { setIntento((n) => n + 1); iniciarCarga(); }}>
              Intentar de nuevo
            </button>
          </>
        )}
        {cargando && !datos && !error && <p className="notice" role="status">Consultando los contenidos…</p>}
        {datos && !error && contenidos.length === 0 && (
          <div className="ap-vacio" role="status">No hay contenidos disponibles en esta categoría.</div>
        )}

        {!error && contenidos.length > 0 && (
          <ul className="ap-lista" aria-label="Contenidos" aria-busy={cargando}>
            {contenidos.map((c) => (
              <li key={c.id}>
                <a className="ap-card" href={`#/aprendizaje/${encodeURIComponent(c.id)}`}>
                  {nombreCategoria(c.categoryId) && <span className="tag">{nombreCategoria(c.categoryId).toUpperCase()}</span>}
                  <h3>{c.title}</h3>
                  <p>Actualizado el {fechaCorta(c.updatedAt)}</p>
                </a>
              </li>
            ))}
          </ul>
        )}

        {!error && datos && datos.total_paginas > 1 && (
          <div className="ap-pager">
            <span>Página {datos.page + 1} de {datos.total_paginas} · {datos.total_elementos} contenidos</span>
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
