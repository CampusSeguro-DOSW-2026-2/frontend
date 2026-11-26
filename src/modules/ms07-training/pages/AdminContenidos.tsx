import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import EditorCategoria from '../components/EditorCategoria';
import EditorContenido from '../components/EditorContenido';
import { trainingApi } from '../services/training';
import type {
  Categoria, CategoriaRequest, Contenido, ContenidoRequest, ContenidoResumen, Pagina,
} from '../types';
import { fechaCorta } from '../utils/formato';
import '../styles/aprendizaje.css';

const MAXIMO = 100;

type Pestana = 'contenidos' | 'categorias';
type EdicionContenido = { tipo: 'nuevo' } | { tipo: 'modificar'; contenido: Contenido } | null;
type EdicionCategoria = { tipo: 'nueva' } | { tipo: 'modificar'; categoria: Categoria } | null;

/**
 * RF-12 Administrar contenidos y categorías (ms07:content:manage): listas con las inactivas, crear, modificar,
 * inactivar y reactivar. Nada se borra: lo inactivo solo deja de verse para la comunidad.
 */
export default function AdminContenidos({ session }: { session: Session }) {
  const [pestana, setPestana] = useState<Pestana>('contenidos');
  const [contenidos, setContenidos] = useState<Pagina<ContenidoResumen> | null>(null);
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [aviso, setAviso] = useState('');
  const [edicionContenido, setEdicionContenido] = useState<EdicionContenido>(null);
  const [edicionCategoria, setEdicionCategoria] = useState<EdicionCategoria>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargarContenidos = async () => {
    try {
      setContenidos(await trainingApi.contenidos(session, { includeInactive: true, size: MAXIMO }));
      setErrorCarga('');
    } catch (err) {
      setErrorCarga(errorMessage(err));
    }
  };

  const cargarCategorias = async () => {
    try {
      setCategorias(await trainingApi.categorias(session, true));
    } catch (err) {
      setAviso(`No se pudieron cargar las categorías. ${errorMessage(err)}`);
    }
  };

  useEffect(() => {
    let vigente = true;
    trainingApi.contenidos(session, { includeInactive: true, size: MAXIMO })
      .then((p) => { if (vigente) setContenidos(p); })
      .catch((err: unknown) => { if (vigente) setErrorCarga(errorMessage(err)); });
    trainingApi.categorias(session, true)
      .then((lista) => { if (vigente) setCategorias(lista); })
      .catch((err: unknown) => { if (vigente) setAviso(`No se pudieron cargar las categorías. ${errorMessage(err)}`); });
    return () => { vigente = false; };
  }, [session]);

  const nombreCategoria = (id: string) => (categorias ?? []).find((c) => c.id === id)?.name ?? '—';

  const cambiarPestana = (p: Pestana) => {
    setPestana(p);
    setAviso('');
  };

  // Contenidos
  const abrirModificarContenido = async (id: string) => {
    setAviso('');
    setOcupado(id);
    try {
      setEdicionContenido({ tipo: 'modificar', contenido: await trainingApi.contenido(session, id) });
    } catch (err) {
      setAviso(errorMessage(err));
    } finally {
      setOcupado(null);
    }
  };

  const guardarContenido = async (datos: ContenidoRequest) => {
    if (edicionContenido?.tipo === 'modificar') {
      await trainingApi.modificarContenido(session, edicionContenido.contenido.id, datos);
    } else {
      await trainingApi.crearContenido(session, datos);
    }
    setEdicionContenido(null);
    await cargarContenidos();
  };

  const cambiarEstadoContenido = async (c: ContenidoResumen) => {
    setAviso('');
    setOcupado(c.id);
    try {
      await (c.status === 'ACTIVO'
        ? trainingApi.inactivarContenido(session, c.id)
        : trainingApi.reactivarContenido(session, c.id));
      await cargarContenidos();
    } catch (err) {
      setAviso(errorMessage(err));
    } finally {
      setOcupado(null);
    }
  };

  // Categorías
  const guardarCategoria = async (datos: CategoriaRequest) => {
    if (edicionCategoria?.tipo === 'modificar') {
      await trainingApi.modificarCategoria(session, edicionCategoria.categoria.id, datos);
    } else {
      await trainingApi.crearCategoria(session, datos);
    }
    setEdicionCategoria(null);
    await cargarCategorias();
  };

  const cambiarEstadoCategoria = async (c: Categoria) => {
    setAviso('');
    setOcupado(c.id);
    try {
      await (c.status === 'ACTIVO'
        ? trainingApi.inactivarCategoria(session, c.id)
        : trainingApi.reactivarCategoria(session, c.id));
      await cargarCategorias();
    } catch (err) {
      setAviso(errorMessage(err));
    } finally {
      setOcupado(null);
    }
  };

  const lista = contenidos?.contenido ?? [];

  return (
    <>
      <PageHeader badge="ADMINISTRACIÓN" title="Contenidos" subtitle="Gestione los contenidos preventivos y sus categorías" />
      <main className="content">
        <div className="pills" role="group" aria-label="Sección">
          <button type="button" className="pill" aria-pressed={pestana === 'contenidos'}
            onClick={() => cambiarPestana('contenidos')}>Contenidos</button>
          <button type="button" className="pill" aria-pressed={pestana === 'categorias'}
            onClick={() => cambiarPestana('categorias')}>Categorías</button>
        </div>

        {aviso && <p className="notice err" role="alert">{aviso}</p>}

        {pestana === 'contenidos' && (
          <>
            {edicionContenido ? (
              <EditorContenido key={edicionContenido.tipo === 'modificar' ? edicionContenido.contenido.id : 'nuevo'}
                inicial={edicionContenido.tipo === 'modificar' ? edicionContenido.contenido : undefined}
                categorias={categorias ?? []} onGuardar={guardarContenido} onCancelar={() => setEdicionContenido(null)} />
            ) : (
              <div className="ap-acciones">
                <button type="button" className="btn red" onClick={() => { setAviso(''); setEdicionContenido({ tipo: 'nuevo' }); }}>
                  Crear contenido
                </button>
              </div>
            )}

            {errorCarga && <p className="notice err" role="alert">{errorCarga}</p>}
            {!contenidos && !errorCarga && <p className="notice" role="status">Cargando los contenidos…</p>}
            {contenidos && lista.length === 0 && (
              <div className="ap-vacio" role="status">Todavía no hay contenidos. Cree el primero.</div>
            )}

            {contenidos && lista.length > 0 && (
              <>
                <div className="ap-scroll">
                  <table className="ap-tabla">
                    <thead>
                      <tr>
                        <th>Título</th><th>Categoría</th><th>Actualizado</th><th>Estado</th>
                        <th><span className="ap-oculto">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((c) => {
                        const activo = c.status === 'ACTIVO';
                        return (
                          <tr key={c.id} className={activo ? '' : 'inactiva'}>
                            <td>{c.title}</td>
                            <td>{nombreCategoria(c.categoryId)}</td>
                            <td>{fechaCorta(c.updatedAt)}</td>
                            <td><span className={`ap-estado ${c.status}`}>{activo ? 'Activo' : 'Inactivo'}</span></td>
                            <td>
                              <div className="ap-fila-acciones">
                                <a className="ap-mini" href={`#/aprendizaje/${encodeURIComponent(c.id)}`}>Ver contenido</a>
                                <button type="button" className="ap-mini" disabled={ocupado === c.id}
                                  onClick={() => abrirModificarContenido(c.id)}>Editar</button>
                                <button type="button" className={`ap-mini${activo ? ' peligro' : ''}`} disabled={ocupado === c.id}
                                  onClick={() => cambiarEstadoContenido(c)}>
                                  {ocupado === c.id ? 'Guardando…' : activo ? 'Inactivar' : 'Reactivar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {contenidos.total_elementos > MAXIMO && (
                  <p className="notice" role="status">
                    Se muestran los primeros {MAXIMO} de {contenidos.total_elementos} contenidos.
                  </p>
                )}
              </>
            )}
          </>
        )}

        {pestana === 'categorias' && (
          <>
            {edicionCategoria ? (
              <EditorCategoria key={edicionCategoria.tipo === 'modificar' ? edicionCategoria.categoria.id : 'nueva'}
                inicial={edicionCategoria.tipo === 'modificar' ? edicionCategoria.categoria : undefined}
                onGuardar={guardarCategoria} onCancelar={() => setEdicionCategoria(null)} />
            ) : (
              <div className="ap-acciones">
                <button type="button" className="btn red" onClick={() => { setAviso(''); setEdicionCategoria({ tipo: 'nueva' }); }}>
                  Crear categoría
                </button>
              </div>
            )}

            {!categorias && !aviso && <p className="notice" role="status">Cargando las categorías…</p>}
            {categorias && categorias.length === 0 && (
              <div className="ap-vacio" role="status">Todavía no hay categorías. Cree la primera.</div>
            )}

            {categorias && categorias.length > 0 && (
              <div className="ap-scroll">
                <table className="ap-tabla">
                  <thead>
                    <tr>
                      <th>Nombre</th><th>Descripción</th><th>Estado</th>
                      <th><span className="ap-oculto">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((c) => {
                      const activa = c.status === 'ACTIVO';
                      return (
                        <tr key={c.id} className={activa ? '' : 'inactiva'}>
                          <td>{c.name}</td>
                          <td>{c.description ?? '—'}</td>
                          <td><span className={`ap-estado ${c.status}`}>{activa ? 'Activa' : 'Inactiva'}</span></td>
                          <td>
                            <div className="ap-fila-acciones">
                              <button type="button" className="ap-mini" disabled={ocupado === c.id}
                                onClick={() => { setAviso(''); setEdicionCategoria({ tipo: 'modificar', categoria: c }); }}>
                                Modificar
                              </button>
                              <button type="button" className={`ap-mini${activa ? ' peligro' : ''}`} disabled={ocupado === c.id}
                                onClick={() => cambiarEstadoCategoria(c)}>
                                {ocupado === c.id ? 'Guardando…' : activa ? 'Inactivar' : 'Reactivar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
