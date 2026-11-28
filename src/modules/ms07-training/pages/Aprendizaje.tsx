import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { FiltroCategorias } from '../components/FiltroCategorias';
import { trainingApi } from '../services/training';
import type { Categoria, ContenidoResumen, Pagina, Progreso } from '../types';
import { fechaCorta } from '../utils/formato';
import '../styles/aprendizaje.css';

const TAMANO_PAGINA = 20;

type Vista = Progreso['contents'][number];

/**
 * RF-12 Centro de aprendizaje: contenidos preventivos activos, con filtro por categoría. Un contenido activo se ve
 * aunque su categoría esté inactiva (aparece en "Todos"); el filtro solo ofrece las categorías activas.
 * Con ms07:quiz:take también muestra el progreso (RF-13): cuántos contenidos ha consultado y la marca «Visto» en cada
 * tarjeta. Si el progreso no se puede consultar, la lista se muestra igual, sin barra ni marcas y sin error.
 */
export default function Aprendizaje({ session }: { session: Session }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoria, setCategoria] = useState('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<Pagina<ContenidoResumen> | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);
  // Contenidos consultados por id; null si no hay permiso o la consulta falló
  const [vistos, setVistos] = useState<Map<string, Vista> | null>(null);
  const [soloPendientes, setSoloPendientes] = useState(false);
  const conProgreso = hasPermission(session, PERMISSION.MS07_QUIZ_TAKE);

  useEffect(() => {
    if (!conProgreso) return undefined;
    let vigente = true;
    trainingApi.progreso(session)
      .then((p) => { if (vigente) setVistos(new Map(p.contents.filter((c) => c.available).map((c) => [c.contentId, c]))); })
      .catch(() => { if (vigente) setVistos(null); });
    return () => { vigente = false; };
  }, [session, conProgreso]);

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
  // Una línea que dice qué es el contenido y para qué sirve: la descripción de su categoría o, si no tiene, una frase
  // armada con el nombre de la categoría
  const resumen = (id: string) => {
    const cat = categorias.find((c) => c.id === id);
    const descripcion = cat?.description?.trim();
    if (descripcion) return descripcion;
    return cat ? `Guía preventiva sobre ${cat.name.toLowerCase()}: le indica cómo prepararse y cómo actuar.` : 'Guía preventiva: le indica cómo prepararse y cómo actuar ante una emergencia.';
  };
  const todos = datos?.contenido ?? [];
  // «Solo pendientes» filtra la página: solo se ofrece cuando todo cabe en una página
  const puedeFiltrar = vistos !== null && !!datos && datos.total_paginas <= 1;
  const contenidos = puedeFiltrar && soloPendientes ? todos.filter((c) => !vistos.has(c.id)) : todos;
  // Y sale del listado (categoría elegida o todas); X, de los consultados que siguen activos en ese mismo grupo
  const total = datos?.total_elementos ?? 0;
  const consultados = vistos
    ? Math.min(total, [...vistos.values()].filter((v) => !categoria || v.categoryId === categoria).length)
    : 0;
  const porcentaje = total > 0 ? Math.round((consultados * 100) / total) : 0;

  return (
    <>
      <PageHeader badge="APRENDIZAJE" title="Centro de aprendizaje" subtitle="Aprenda a prevenir y a actuar ante una emergencia" />
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
        {cargando && !datos && !error && <Cargando texto="Consultando los contenidos…" />}

        {vistos && datos && !error && total > 0 && (
          <section className="ap-progreso" aria-label="Su progreso">
            <div className="ap-progreso-texto">
              <span>Ha consultado <b>{consultados}</b> de <b>{total}</b> contenidos{categoria ? ' de esta categoría' : ''}</span>
              {puedeFiltrar && (
                <label className="ap-pendientes">
                  <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
                  Solo pendientes
                </label>
              )}
            </div>
            <div className="ap-barra" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={consultados}
              aria-valuetext={`${consultados} de ${total} contenidos consultados`}>
              <span style={{ width: `${porcentaje}%` }} />
            </div>
          </section>
        )}

        {datos && !error && soloPendientes && puedeFiltrar && todos.length > 0 && contenidos.length === 0 && (
          <EstadoVacio titulo="Ya consultó todos estos contenidos">Quite «Solo pendientes» para verlos de nuevo.</EstadoVacio>
        )}
        {datos && !error && todos.length === 0 && (
          categoria
          ? <EstadoVacio titulo="No hay contenidos en esta categoría">Elija otra o «Todas».</EstadoVacio>
          : <EstadoVacio titulo="Todavía no hay contenidos disponibles" />
        )}

        {!error && contenidos.length > 0 && (
          <ul className="ap-lista" aria-label="Contenidos" aria-busy={cargando}>
            {contenidos.map((c) => (
              <li key={c.id}>
                <a className="ap-card" href={`#/aprendizaje/${encodeURIComponent(c.id)}`}>
                  {(nombreCategoria(c.categoryId) || vistos?.has(c.id)) && (
                    <div className="ap-card-cab">
                      {nombreCategoria(c.categoryId) && <span className="tag">{nombreCategoria(c.categoryId).toUpperCase()}</span>}
                      {vistos?.has(c.id) && (
                        <span className="ap-visto">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                          Visto el {fechaCorta(vistos.get(c.id)?.lastViewedAt ?? '')}
                        </span>
                      )}
                    </div>
                  )}
                  <h3>{c.title}</h3>
                  <p className="ap-resumen">{resumen(c.categoryId)}</p>
                  <small className="ap-fecha">Actualizado el {fechaCorta(c.updatedAt)} · Leer →</small>
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
