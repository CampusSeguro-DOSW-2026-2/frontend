import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { Falla } from '../components/comun';
import { campus, CampusApiError, comoCampusError as comoError, currentPermissions } from '../services/campus';
import type { Edificio, RecomendacionPreventiva } from '../types';
import { TIPOS } from '../types';
import '../styles/campus.css';
import '../styles/comunidad.css';

const CABECERA = (
  <PageHeader
    badge="CAMPUS"
    title="Información preventiva"
    subtitle="Recomendaciones para prepararte antes de una emergencia, por edificio y por tipo de espacio."
  />
);

export default function PreventivaEstudiante() {
  const puedeConsultar = currentPermissions().includes(PERMISSION.MS02_PREVENTIVE_INFO_READ);

  const [recomendaciones, setRecomendaciones] = useState<RecomendacionPreventiva[] | null>(null);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [error, setError] = useState<CampusApiError | null>(null);

  useEffect(() => {
    if (!puedeConsultar) return undefined;
    let vigente = true;
    campus.recomendaciones.listar()
      .then((lista) => { if (vigente) setRecomendaciones(lista.filter((r) => r.estado === 'ACTIVO')); })
      .catch((e) => { if (vigente) setError(comoError(e)); });
    // Los nombres de edificio solo adornan la lista: si no cargan, las recomendaciones se siguen viendo.
    campus.edificios.listar()
      .then((lista) => { if (vigente) setEdificios(lista); })
      .catch(() => { if (vigente) setEdificios([]); });
    return () => { vigente = false; };
  }, [puedeConsultar]);

  if (!puedeConsultar) {
    return (
      <>
        {CABECERA}
        <main className="content">
          <p className="cs-alert stop" role="alert">Tu rol no tiene permiso para consultar la información preventiva.</p>
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

  if (!recomendaciones) {
    return (
      <>
        {CABECERA}
        <main className="content"><p className="cs-resumen">Cargando recomendaciones…</p></main>
      </>
    );
  }

  const nombreEdificio = new Map(edificios.map((e) => [e.id, e.nombre]));
  const porEdificio = recomendaciones
    .filter((r) => r.ambito === 'EDIFICIO')
    .sort((a, b) => (nombreEdificio.get(a.edificioId ?? '') ?? '').localeCompare(nombreEdificio.get(b.edificioId ?? '') ?? ''));
  const porTipo = recomendaciones
    .filter((r) => r.ambito === 'TIPO_ESPACIO')
    .sort((a, b) => TIPOS[a.tipoEspacio ?? 'SALON'].localeCompare(TIPOS[b.tipoEspacio ?? 'SALON']));

  const tarjeta = (r: RecomendacionPreventiva) => {
    const destino = r.ambito === 'EDIFICIO'
      ? nombreEdificio.get(r.edificioId ?? '') ?? 'Edificio'
      : TIPOS[r.tipoEspacio ?? 'SALON'];
    return (
      <li key={r.id} className="cs-recomendacion">
        <h4>{r.titulo}</h4>
        <span className="cs-sub">{destino}</span>
        <p className="cs-texto">{r.recomendacion}</p>
      </li>
    );
  };

  return (
    <>
      {CABECERA}
      <main className="content">
        {recomendaciones.length === 0 ? (
          <p className="cs-alert info">Todavía no hay recomendaciones preventivas publicadas.</p>
        ) : (
          <>
            {porEdificio.length > 0 && (
              <section className="cs-piso" aria-labelledby="prev-edificio">
                <h3 className="cs-piso-titulo" id="prev-edificio">Por edificio</h3>
                <ul className="cs-recomendaciones">{porEdificio.map(tarjeta)}</ul>
              </section>
            )}
            {porTipo.length > 0 && (
              <section className="cs-piso" aria-labelledby="prev-tipo">
                <h3 className="cs-piso-titulo" id="prev-tipo">Por tipo de espacio</h3>
                <ul className="cs-recomendaciones">{porTipo.map(tarjeta)}</ul>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
