import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import GaleriaImagenes from '../components/GaleriaImagenes';
import { Paginacion } from '../components/Paginacion';
import { Falla } from '../components/comun';
import { campus, CampusApiError, comoCampusError as comoError, currentPermissions } from '../services/campus';
import type { ZonaSegura } from '../types';
import { enlaceOsm, textoCoordenadas } from '../utils/coordenadas';
import { paginar } from '../utils/paginacion';
import '../styles/campus.css';
import '../styles/comunidad.css';

const POR_PAGINA = 6;

const CABECERA = (
  <PageHeader
    badge="CAMPUS"
    title="Zonas seguras"
    subtitle="Consulta los puntos de encuentro del campus y cómo llegar a ellos."
  />
);

/** Los puntos de encuentro primero y luego por nombre. */
const ordenar = (a: ZonaSegura, b: ZonaSegura) =>
  Number(b.puntoEncuentro) - Number(a.puntoEncuentro) || a.nombre.localeCompare(b.nombre);

export default function ZonasSegurasEstudiante() {
  const puedeConsultar = currentPermissions().includes(PERMISSION.MS02_CAMPUS_READ);

  const [zonas, setZonas] = useState<ZonaSegura[] | null>(null);
  const [error, setError] = useState<CampusApiError | null>(null);
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    if (!puedeConsultar) return undefined;
    let vigente = true;
    campus.zonas.listar()
      .then((lista) => { if (vigente) setZonas(lista.filter((z) => z.estado === 'ACTIVO').sort(ordenar)); })
      .catch((e) => { if (vigente) setError(comoError(e)); });
    return () => { vigente = false; };
  }, [puedeConsultar]);

  if (!puedeConsultar) {
    return (
      <>
        {CABECERA}
        <main className="content">
          <p className="cs-alert stop" role="alert">Tu rol no tiene permiso para consultar las zonas seguras.</p>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        {CABECERA}
        <main className="content"><Falla error={error} /></main>
      </>
    );
  }

  if (!zonas) {
    return (
      <>
        {CABECERA}
        <main className="content"><p className="cs-resumen">Cargando zonas seguras…</p></main>
      </>
    );
  }

  const vista = paginar(zonas, pagina, POR_PAGINA);

  return (
    <>
      {CABECERA}
      <main className="content">
        {zonas.length === 0 ? (
          <p className="cs-alert info">Todavía no hay zonas seguras activas para consultar.</p>
        ) : (
          <>
            <p className="cs-resumen">
              {zonas.length} {zonas.length === 1 ? 'zona segura' : 'zonas seguras'}
            </p>
            <div className="cs-zonas-comunidad">
              {vista.items.map((zona) => (
                <article className="cs-zona-comunidad" key={zona.id}>
                  <div className="cs-zona-etiquetas">
                    <span className="cs-codigo">{zona.codigo}</span>
                    <span className={`cs-estado ${zona.puntoEncuentro ? 'ok' : 'info'}`}>
                      {zona.puntoEncuentro ? 'PUNTO DE ENCUENTRO' : 'ZONA SEGURA'}
                    </span>
                  </div>
                  <h2>{zona.nombre}</h2>
                  <p>{zona.descripcion}</p>
                  <div className="cs-zona-datos">
                    <span>Ubicación: {zona.ubicacion}</span>
                    <span>Capacidad: {zona.capacidad} personas</span>
                    {zona.latitud != null && zona.longitud != null && (
                      <>
                        <span>Coordenadas: {textoCoordenadas(zona.latitud, zona.longitud)}</span>
                        <a href={enlaceOsm(zona.latitud, zona.longitud)} target="_blank" rel="noopener noreferrer">
                          Ver en el mapa
                        </a>
                      </>
                    )}
                  </div>
                  <GaleriaImagenes tipoElemento="ZONA_SEGURA" elementoId={zona.id} editable={false} />
                </article>
              ))}
            </div>
            <Paginacion actual={vista.actual} paginas={vista.paginas} total={zonas.length} nombre="zonas seguras"
              onCambiar={(p) => { setPagina(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </>
        )}
      </main>
    </>
  );
}
