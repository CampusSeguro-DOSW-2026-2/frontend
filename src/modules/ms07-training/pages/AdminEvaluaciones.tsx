import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import EditorEvaluacion from '../components/EditorEvaluacion';
import { trainingApi } from '../services/training';
import type { Categoria, Evaluacion, EvaluacionRequest, EvaluacionResumen } from '../types';
import '../styles/evaluaciones.css';

type Edicion = { tipo: 'nueva' } | { tipo: 'modificar'; evaluacion: Evaluacion } | null;

/**
 * RF-14 Administrar evaluaciones (ms07:content:manage): lista con las inactivas, crear, modificar, inactivar y
 * reactivar. MS07 rechaza modificar una evaluación que ya tiene intentos (409): hay que inactivarla y crear otra.
 */
export default function AdminEvaluaciones({ session }: { session: Session }) {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionResumen[] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [errorCarga, setErrorCarga] = useState('');
  const [aviso, setAviso] = useState('');
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = async () => {
    try {
      const pagina = await trainingApi.evaluaciones(session, { includeInactive: true, size: 100 });
      setEvaluaciones(pagina.contenido);
      setErrorCarga('');
    } catch (err) {
      setErrorCarga(errorMessage(err));
    }
  };

  useEffect(() => {
    let vigente = true;
    trainingApi.evaluaciones(session, { includeInactive: true, size: 100 })
      .then((p) => { if (vigente) setEvaluaciones(p.contenido); })
      .catch((err: unknown) => { if (vigente) setErrorCarga(errorMessage(err)); });
    trainingApi.categorias(session, true)
      .then((lista) => { if (vigente) setCategorias(lista); })
      .catch((err: unknown) => { if (vigente) setAviso(`No se pudieron cargar las categorías. ${errorMessage(err)}`); });
    return () => { vigente = false; };
  }, [session]);

  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.name ?? '—';

  const abrirModificar = async (id: string) => {
    setAviso('');
    setOcupado(id);
    try {
      setEdicion({ tipo: 'modificar', evaluacion: await trainingApi.evaluacion(session, id) });
    } catch (err) {
      setAviso(errorMessage(err));
    } finally {
      setOcupado(null);
    }
  };

  const guardar = async (datos: EvaluacionRequest) => {
    if (edicion?.tipo === 'modificar') await trainingApi.modificar(session, edicion.evaluacion.id, datos);
    else await trainingApi.crear(session, datos);
    setEdicion(null);
    await cargar();
  };

  const cambiarEstado = async (e: EvaluacionResumen) => {
    setAviso('');
    setOcupado(e.id);
    try {
      await (e.status === 'ACTIVO' ? trainingApi.inactivar(session, e.id) : trainingApi.reactivar(session, e.id));
      await cargar();
    } catch (err) {
      setAviso(errorMessage(err));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <>
      <PageHeader badge="ADMINISTRACIÓN" title="Evaluaciones" subtitle="Cree las evaluaciones cortas de cada categoría" />
      <main className="content">
        {aviso && <Mensaje tono="error">{aviso}</Mensaje>}

        {edicion ? (
          <EditorEvaluacion key={edicion.tipo === 'modificar' ? edicion.evaluacion.id : 'nueva'}
            inicial={edicion.tipo === 'modificar' ? edicion.evaluacion : undefined}
            categorias={categorias} onGuardar={guardar} onCancelar={() => setEdicion(null)} />
        ) : (
          <div className="evl-acciones">
            <button type="button" className="btn red" onClick={() => { setAviso(''); setEdicion({ tipo: 'nueva' }); }}>
              Crear evaluación
            </button>
          </div>
        )}

        {errorCarga && <Mensaje tono="error">{errorCarga}</Mensaje>}
        {!evaluaciones && !errorCarga && <Cargando texto="Cargando las evaluaciones…" />}
        {evaluaciones && evaluaciones.length === 0 && (
          <EstadoVacio titulo="Todavía no hay evaluaciones">Cree la primera.</EstadoVacio>
        )}

        {evaluaciones && evaluaciones.length > 0 && (
          <table className="evl-tabla">
            <thead>
              <tr><th>Título</th><th>Tema</th><th>Categoría</th><th>Estado</th><th><span className="evl-oculto">Acciones</span></th></tr>
            </thead>
            <tbody>
              {evaluaciones.map((e) => {
                const activa = e.status === 'ACTIVO';
                return (
                  <tr key={e.id} className={activa ? '' : 'inactiva'}>
                    <td>{e.title}</td>
                    <td>{e.topic}</td>
                    <td>{nombreCategoria(e.categoryId)}</td>
                    <td><span className={`evl-estado ${e.status}`}>{activa ? 'Activa' : 'Inactiva'}</span></td>
                    <td>
                      <div className="evl-fila-acciones">
                        <button type="button" className="evl-mini" disabled={ocupado === e.id}
                          onClick={() => abrirModificar(e.id)}>Editar</button>
                        <button type="button" className={`evl-mini${activa ? ' peligro' : ''}`} disabled={ocupado === e.id}
                          onClick={() => cambiarEstado(e)}>
                          {ocupado === e.id ? 'Guardando…' : activa ? 'Inactivar' : 'Reactivar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
