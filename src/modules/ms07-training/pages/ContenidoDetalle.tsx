import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { trainingApi } from '../services/training';
import type { Categoria, Contenido } from '../types';
import { fechaCorta } from '../utils/formato';
import '../styles/aprendizaje.css';

/**
 * RF-12 Detalle de un contenido. El cuerpo es texto plano y se muestra como tal. Al abrirlo se registra la consulta
 * en el progreso del usuario (RF-13): si ese registro falla, la lectura no se interrumpe. Si ya lo había consultado
 * antes, una línea discreta dice desde cuándo (solo con ms07:quiz:take; si el progreso falla, no se muestra nada).
 */
export default function ContenidoDetalle({ session, id }: { session: Session; id: string }) {
  const [contenido, setContenido] = useState<Contenido | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [error, setError] = useState('');
  const [primeraVez, setPrimeraVez] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    // El progreso se lee antes de registrar esta visita: así «primera vez» es de una visita anterior
    const previo = hasPermission(session, PERMISSION.MS07_QUIZ_TAKE)
      ? trainingApi.progreso(session)
        .then((p) => {
          const visto = p.contents.find((c) => c.contentId === id);
          if (vigente) setPrimeraVez(visto ? visto.firstViewedAt : null);
        })
        .catch(() => undefined)
      : Promise.resolve();
    trainingApi.contenido(session, id)
      .then(async (c) => {
        if (!vigente) return;
        setContenido(c);
        // Solo quien lee como comunidad (ms07:content:read) tiene progreso
        if (hasPermission(session, PERMISSION.MS07_CONTENT_READ)) {
          await previo;
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
            ? <Mensaje tono="error">{error}</Mensaje>
            : <Cargando texto="Cargando el contenido…" />}
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
            <Mensaje tono="info">Este contenido está inactivo: solo lo ve quien administra.</Mensaje>
          )}
          <div className="ap-cuerpo">{contenido.body}</div>
          <p className="ap-fecha">
            Actualizado el {fechaCorta(contenido.updatedAt)}
            {primeraVez && <> · Consultado por primera vez el {fechaCorta(primeraVez)}</>}
          </p>
        </article>
      </main>
    </>
  );
}
