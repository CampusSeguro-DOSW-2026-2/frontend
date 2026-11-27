import { useEffect, useState, type ReactNode } from 'react';
import { Building } from '../../../shared/components/Icons';
import { campus } from '../services/campus';
import { imagenesApi } from '../services/imagenes';
import type { Edificio } from '../types';
import { normalizar } from '../utils/formato';
import '../styles/edificios.css';

/** Miniatura de 56 px: la primera foto del edificio o, si no hay (o no carga), el icono del edificio. */
function Miniatura({ edificioId }: { edificioId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [rota, setRota] = useState(false);

  useEffect(() => {
    let vigente = true;
    let creada: string | null = null;
    imagenesApi.listar('EDIFICIO', edificioId)
      .then((lista) => (lista[0] ? imagenesApi.obtenerArchivo(lista[0].id) : null))
      .then((blob) => {
        if (!vigente || !blob) return;
        creada = URL.createObjectURL(blob);
        setUrl(creada);
      })
      .catch(() => { /* sin foto: queda el icono */ });
    return () => {
      vigente = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [edificioId]);

  return (
    <div className="cs-edif-mini" aria-hidden="true">
      {url && !rota ? <img src={url} alt="" onError={() => setRota(true)} /> : <Building />}
    </div>
  );
}

/** Pisos activos y, si se pide, si le falta escalera (más de un piso y ninguna escalera activa). Dos consultas livianas. */
function useResumen(edificioId: string, revisarEscaleras: boolean) {
  const [pisos, setPisos] = useState<number | null>(null);
  const [faltaEscalera, setFaltaEscalera] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      campus.pisos.listarPorEdificio(edificioId),
      revisarEscaleras ? campus.escaleras.listarPorEdificio(edificioId) : Promise.resolve(null),
    ])
      .then(([listaPisos, escaleras]) => {
        if (!vigente) return;
        const activos = listaPisos.filter((p) => p.estado === 'ACTIVO').length;
        setPisos(activos);
        setFaltaEscalera(escaleras !== null && activos > 1 && !escaleras.some((e) => e.estado === 'ACTIVO'));
      })
      .catch(() => { /* sin resumen: la tarjeta se muestra igual */ });
    return () => { vigente = false; };
  }, [edificioId, revisarEscaleras]);

  return { pisos, faltaEscalera };
}

/**
 * Tarjeta compacta de un edificio: miniatura, nombre, descripción en una línea, número de pisos y chips. Toda la
 * tarjeta abre `href`; las `acciones` (pequeñas, secundarias) quedan por encima del enlace.
 */
export function TarjetaEdificio({ edificio, href, chips, revisarEscaleras = false, descripcionVacia, acciones }: {
  edificio: Edificio;
  href: string;
  /** Chips después del número de pisos (por ejemplo, el estado). */
  chips?: ReactNode;
  /** Muestra «Falta escalera» cuando corresponde (administración). */
  revisarEscaleras?: boolean;
  descripcionVacia: string;
  acciones?: ReactNode;
}) {
  const { pisos, faltaEscalera } = useResumen(edificio.id, revisarEscaleras);
  const inactivo = edificio.estado !== 'ACTIVO';
  // Si la descripción ya habla de los pisos («Tres pisos de aulas»), el conteo sobra
  const descripcionConPisos = /\bpisos?\b/.test(normalizar(edificio.descripcion ?? ''));

  return (
    <article className={`cs-edif${inactivo ? ' inactivo' : ''}`}>
      <Miniatura edificioId={edificio.id} />
      <div className="cs-edif-info">
        <h3><a className="cs-edif-enlace" href={href}>{edificio.nombre}</a></h3>
        <p className="cs-edif-desc" title={edificio.descripcion || undefined}>{edificio.descripcion || descripcionVacia}</p>
        <div className="cs-edif-meta">
          {pisos !== null && !descripcionConPisos && <span>{pisos} {pisos === 1 ? 'piso' : 'pisos'}</span>}
          {chips}
          {faltaEscalera && <span className="cs-estado warn">Falta escalera</span>}
        </div>
      </div>
      {acciones && <div className="cs-edif-acciones">{acciones}</div>}
    </article>
  );
}

