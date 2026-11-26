import { Cargando } from '../../../shared/components/Cargando';
import { Mensaje } from '../../../shared/components/Mensaje';
import { useCallback, useEffect, useState } from 'react';
import { Building } from '../../../shared/components/Icons';
import { confirmar } from '../../../shared/services/feedback';
import {
  imagenesApi,
  type ImagenCampus,
  type TipoElementoImagen,
} from '../services/imagenes';

interface FotoCargada {
  imagen: ImagenCampus;
  url: string;
}

interface Props {
  tipoElemento: TipoElementoImagen;
  elementoId: string;
  editable?: boolean;
  /** Fotos grandes, una debajo de otra (vista de detalle). */
  grande?: boolean;
  /** Solo la primera foto, como portada de una tarjeta (consulta de la comunidad). */
  portada?: boolean;
  /** Nombre del elemento: texto alternativo de la foto y del respaldo visual cuando no hay foto. */
  nombre?: string;
}

/** Respaldo visual cuando no hay foto o no se pudo cargar: icono y nombre, nunca una caja vacía. */
function SinFoto({ nombre }: { nombre?: string }) {
  return (
    <div className="cs-sin-foto" role="img" aria-label={nombre ? `${nombre}: sin fotografía disponible` : 'Sin fotografía disponible'}>
      <Building />
      {nombre && <b aria-hidden="true">{nombre}</b>}
      <small aria-hidden="true">Sin fotografía disponible</small>
    </div>
  );
}

export default function GaleriaImagenes({
  tipoElemento,
  elementoId,
  editable = true,
  grande = false,
  portada = false,
  nombre,
}: Props) {
  // Fotos que el navegador no pudo mostrar (archivo dañado o enlace vencido): se ocultan y, si no queda ninguna, se ve el respaldo
  const [rotas, setRotas] = useState<string[]>([]);
  const [fotos, setFotos] = useState<FotoCargada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);

  const recargar = useCallback(() => setRecarga((valor) => valor + 1), []);

  useEffect(() => {
    let vigente = true;
    let urls: string[] = [];

    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const lista = await imagenesApi.listar(tipoElemento, elementoId);
        // Si un archivo falla, se muestran los demás: una foto que no carga no debe ocultar las que sí existen
        const resultados = await Promise.allSettled(
          lista.map(async (imagen) => ({
            imagen,
            blob: await imagenesApi.obtenerArchivo(imagen.id),
          })),
        );
        const archivos = resultados.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));

        if (!vigente) return;

        urls = archivos.map(({ blob }) => URL.createObjectURL(blob));
        setRotas([]);
        setFotos(archivos.map(({ imagen }, indice) => ({
          imagen,
          url: urls[indice],
        })));
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : 'No fue posible cargar las imágenes.');
      } finally {
        if (vigente) setCargando(false);
      }
    };

    void cargar();

    return () => {
      vigente = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [tipoElemento, elementoId, recarga]);

  const subir = async (archivos: FileList | null) => {
    if (!archivos?.length) return;

    const seleccion = Array.from(archivos);
    const noValidos = seleccion.filter((archivo) =>
      !['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)
      || archivo.size > 5 * 1024 * 1024
      || archivo.size === 0,
    );

    if (noValidos.length) {
      setError('Solo se permiten imágenes JPEG, PNG o WEBP de máximo 5 MB cada una.');
      return;
    }

    setSubiendo(true);
    setError('');
    try {
      for (const archivo of seleccion) {
        await imagenesApi.subir(tipoElemento, elementoId, archivo);
      }
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible subir las imágenes.');
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (id: string) => {
    if (!(await confirmar({ titulo: '¿Eliminar esta fotografía?', texto: 'La fotografía se borra de forma permanente.', accion: 'Eliminar fotografía', peligro: true }))) return;

    setEliminando(id);
    setError('');
    try {
      await imagenesApi.eliminar(id);
      recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible eliminar la imagen.');
    } finally {
      setEliminando(null);
    }
  };

  const visibles = fotos.filter((f) => !rotas.includes(f.imagen.id));
  const marcarRota = (id: string) => setRotas((previas) => (previas.includes(id) ? previas : [...previas, id]));

  // Consulta (sin edición): la foto se muestra siempre que exista; si no hay o falla, el respaldo visual
  if (!editable) {
    if (cargando) return <div className={`cs-portada cargando${grande ? ' grande' : ''}`} aria-hidden="true" />;
    if (visibles.length === 0) return <div className={`cs-portada${grande ? ' grande' : ''}`}><SinFoto nombre={nombre} /></div>;
    const mostradas = portada ? visibles.slice(0, 1) : visibles;
    return (
      <div className={`cs-portada-lista${grande ? ' grande' : ''}`}>
        {mostradas.map(({ imagen, url }) => (
          <figure className={`cs-portada${grande ? ' grande' : ''}`} key={imagen.id}>
            <img src={url} alt={nombre ? `Fotografía de ${nombre}` : imagen.nombreOriginal} loading="lazy"
              onError={() => marcarRota(imagen.id)} />
          </figure>
        ))}
      </div>
    );
  }

  return (
    <section className={`cs-galeria${grande ? ' cs-galeria-grande' : ''}`} aria-label="Fotografías del elemento">
      <div className="cs-galeria-cabecera">
        <strong>Fotografías</strong>
        {editable && (
          <label className="cs-mini cs-galeria-subir">
            {subiendo ? 'Subiendo…' : 'Agregar fotos'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={subiendo}
              onChange={(e) => {
                void subir(e.target.files);
                e.currentTarget.value = '';
              }}
            />
          </label>
        )}
      </div>

      {error && <Mensaje tono="aviso">{error}</Mensaje>}
      {cargando ? (
        <Cargando texto="Cargando fotografías…" />
      ) : fotos.length === 0 ? (
        <SinFoto nombre={nombre} />
      ) : (
        <div className="cs-galeria-lista">
          {fotos.map(({ imagen, url }) => (
            <figure className="cs-galeria-foto" key={imagen.id}>
              <a href={url} target="_blank" rel="noreferrer" aria-label={`Ver ${imagen.nombreOriginal}`}>
                <img src={url} alt={imagen.nombreOriginal} loading="lazy" />
              </a>
              <figcaption>
                <span title={imagen.nombreOriginal}>{imagen.nombreOriginal}</span>
                {editable && (
                  <button
                    type="button"
                    className="cs-mini peligro"
                    disabled={eliminando === imagen.id}
                    onClick={() => void eliminar(imagen.id)}
                  >
                    {eliminando === imagen.id ? 'Eliminando…' : 'Eliminar'}
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
