import { useCallback, useEffect, useState } from 'react';
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
}

export default function GaleriaImagenes({
  tipoElemento,
  elementoId,
  editable = true,
  grande = false,
}: Props) {
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
        const archivos = await Promise.all(
          lista.map(async (imagen) => ({
            imagen,
            blob: await imagenesApi.obtenerArchivo(imagen.id),
          })),
        );

        if (!vigente) return;

        urls = archivos.map(({ blob }) => URL.createObjectURL(blob));
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
    if (!window.confirm('¿Seguro que deseas eliminar esta imagen?')) return;

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

      {error && <p className="cs-alert warn" role="alert">{error}</p>}
      {cargando ? (
        <p className="cs-vacio">Cargando fotografías…</p>
      ) : fotos.length === 0 ? (
        <p className="cs-galeria-sin-foto">Sin foto</p>
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
