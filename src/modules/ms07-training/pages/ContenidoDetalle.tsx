import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { trainingApi } from '../services/training';
import type { Categoria, Contenido } from '../types';
import { fechaCorta } from '../utils/formato';
import '../styles/aprendizaje.css';

/**
 * RF-12 Detalle de un contenido. El cuerpo es texto plano y se muestra como tal. Al abrirlo se registra la consulta
 * en el progreso del usuario (RF-13): si ese registro falla, la lectura no se interrumpe.
 */
export default function ContenidoDetalle({ session, id }: { session: Session; id: string }) {
  const [contenido, setContenido] = useState<Contenido | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    trainingApi.contenido(session, id)
      .then((c) => {
        if (!vigente) return;
        setContenido(c);
        // Solo quien lee como comunidad (ms07:content:read) tiene progreso
        if (hasPermission(session, 'ms07:content:read')) {
          trainingApi.registrarVista(session, id).catch(() => undefined);
        }
      })
      .catch((err: unknown) => { if (vigente) setError(errorMessage(err)); });
    trainingApi.categorias(session, true)
      .then((lista) => { if (vigente) setCategorias(lista); })
      .catch(() => { if (vigente) setCategorias([]); });
    return () => { vigente = false; };
  }, [session, id]);

  const volver = <a className="ap-volver" href="#/aprendizaje">← Centro de aprendizaje</a>;

  if (error || !contenido) {
    return (
      <>
        <PageHeader badge="APRENDIZAJE" title="Contenido" subtitle="" context={volver} />
        <main className="content">
          {error
            ? <p className="notice err" role="alert">{error}</p>
            : <p className="notice" role="status">Cargando el contenido…</p>}
        </main>
      </>
    );
  }

  const categoria = categorias.find((c) => c.id === contenido.categoryId)?.name;

  return (
    <>
      <PageHeader badge="APRENDIZAJE" title={contenido.title} subtitle={categoria ? `Categoría: ${categoria}` : ''} context={volver} />
      <main className="content">
        <article className="ap-articulo">
          {contenido.status === 'INACTIVO' && (
            <p className="notice" role="status">Este contenido está inactivo: solo lo ve quien administra.</p>
          )}
          <div className="ap-cuerpo">{contenido.body}</div>
          <p className="ap-fecha">Actualizado el {fechaCorta(contenido.updatedAt)}</p>
        </article>
      </main>
    </>
  );
}
