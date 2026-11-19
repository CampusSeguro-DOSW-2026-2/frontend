import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Vista previa: solo se muestran (y descargan) las primeras fotos. */
  maximo?: number;
  /** Enlace a la vista donde se ven todas las fotos, para cuando hay más que el máximo. */
  verTodasHref?: string;
  /** Miniaturas sin cabecera, para una celda de tabla. */
  compacta?: boolean;
}

/** Foto ampliada en una ventana sobre la página: Esc o el fondo la cierran y las flechas pasan de foto. */
function VisorFoto({ fotos, indice, onCambiar, onCerrar }: {
  fotos: FotoCargada[]; indice: number; onCambiar: (indice: number) => void; onCerrar: () => void;
}) {
  const cerrar = useRef<HTMLButtonElement>(null);
  const hayVarias = fotos.length > 1;
  const anterior = () => onCambiar((indice - 1 + fotos.length) % fotos.length);
  const siguiente = () => onCambiar((indice + 1) % fotos.length);

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    cerrar.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      else if (e.key === 'ArrowLeft' && hayVarias) onCambiar((indice - 1 + fotos.length) % fotos.length);
      else if (e.key === 'ArrowRight' && hayVarias) onCambiar((indice + 1) % fotos.length);
    };
    window.addEventListener('keydown', alTeclear);
    return () => { window.removeEventListener('keydown', alTeclear); previo?.focus(); };
  }, [indice, fotos.length, hayVarias, onCambiar, onCerrar]);

  const { imagen, url } = fotos[indice];
  return (
    <div className="cs-visor" role="dialog" aria-modal="true" aria-label={imagen.nombreOriginal}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <figure className="cs-visor-foto">
        <img src={url} alt={imagen.nombreOriginal} />
        <figcaption>
          <span>{imagen.nombreOriginal}</span>
          {hayVarias && <span className="cs-visor-contador">{indice + 1} de {fotos.length}</span>}
        </figcaption>
      </figure>
      <button ref={cerrar} type="button" className="cs-visor-cerrar" onClick={onCerrar} aria-label="Cerrar la foto">×</button>
      {hayVarias && (
        <>
          <button type="button" className="cs-visor-nav anterior" onClick={anterior} aria-label="Foto anterior">‹</button>
          <button type="button" className="cs-visor-nav siguiente" onClick={siguiente} aria-label="Foto siguiente">›</button>
        </>
      )}
    </div>
  );
}

export default function GaleriaImagenes({
  tipoElemento,
  elementoId,
  editable = true,
  grande = false,
  maximo,
  verTodasHref,
  compacta = false,
}: Props) {
  const [fotos, setFotos] = useState<FotoCargada[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [abierta, setAbierta] = useState<number | null>(null);

  const recargar = useCallback(() => setRecarga((valor) => valor + 1), []);
  const cerrarVisor = useCallback(() => setAbierta(null), []);

  useEffect(() => {
    let vigente = true;
    let urls: string[] = [];

    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const lista = await imagenesApi.listar(tipoElemento, elementoId);
        const visibles = maximo === undefined ? lista : lista.slice(0, maximo);
        const archivos = await Promise.all(
          visibles.map(async (imagen) => ({
            imagen,
            blob: await imagenesApi.obtenerArchivo(imagen.id),
          })),
        );

        if (!vigente) return;

        urls = archivos.map(({ blob }) => URL.createObjectURL(blob));
        setTotal(lista.length);
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
  }, [tipoElemento, elementoId, recarga, maximo]);

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

  const ocultas = total - fotos.length;

  return (
    <section className={`cs-galeria${grande ? ' cs-galeria-grande' : ''}${compacta ? ' cs-galeria-compacta' : ''}`}
      aria-label="Fotografías del elemento">
      {(!compacta || editable) && <div className="cs-galeria-cabecera">
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
      </div>}

      {error && <p className="cs-alert warn" role="alert">{error}</p>}
      {cargando ? (
        <p className="cs-vacio">Cargando fotografías…</p>
      ) : fotos.length === 0 ? (
        <p className="cs-galeria-sin-foto">Sin foto</p>
      ) : (
        <div className="cs-galeria-lista">
          {fotos.map(({ imagen, url }, indice) => (
            <figure className="cs-galeria-foto" key={imagen.id}>
              <button type="button" className="cs-galeria-ampliar" onClick={() => setAbierta(indice)}
                aria-label={`Ampliar ${imagen.nombreOriginal}`}>
                <img src={url} alt={imagen.nombreOriginal} loading="lazy" />
              </button>
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
          {ocultas > 0 && (
            verTodasHref
              ? <a className="cs-galeria-mas" href={verTodasHref}>+{ocultas} {ocultas === 1 ? 'foto' : 'fotos'}</a>
              : <span className="cs-galeria-mas">+{ocultas} {ocultas === 1 ? 'foto' : 'fotos'}</span>
          )}
        </div>
      )}

      {abierta !== null && fotos[abierta] && (
        <VisorFoto fotos={fotos} indice={abierta} onCambiar={setAbierta} onCerrar={cerrarVisor} />
      )}
    </section>
  );
}
