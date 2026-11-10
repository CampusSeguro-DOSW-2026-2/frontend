import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import GaleriaImagenes from '../components/GaleriaImagenes';
import { campus, rolesDeSesion } from '../services/campus';
import type { Edificio, Espacio, Piso } from '../types';
import { TIPOS } from '../types';
import '../styles/campus.css';
import '../styles/estudiante.css';

const ROLES_CONSULTA = [
  'ESTUDIANTE',
  'PROFESOR',
  'ADMINISTRATIVO',
  'BRIGADISTA',
  'COORDINADOR',
  'ORGANIZADOR',
  'ADMIN',
  'AUDITOR',
];

interface Props {
  edificioId?: string;
}

export default function EdificiosEstudiante({ edificioId }: Props) {
  const roles = rolesDeSesion();
  const puedeConsultar = roles !== null && roles.some((rol) => ROLES_CONSULTA.includes(rol));

  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [edificio, setEdificio] = useState<Edificio | null>(null);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      setCargando(true);
      setError('');

      if (!puedeConsultar) {
        setError('Tu rol no tiene permiso para consultar el campus.');
        setCargando(false);
        return;
      }

      try {
        if (edificioId) {
          const [resultadoEdificio, resultadoPisos, resultadoEspacios] = await Promise.all([
            campus.edificios.obtener(edificioId),
            campus.pisos.listarPorEdificio(edificioId),
            campus.espacios.listarPorEdificio(edificioId),
          ]);

          if (!vigente) return;

          if (resultadoEdificio.estado !== 'ACTIVO') {
            setError('Este edificio no está disponible para consulta.');
            return;
          }

          setEdificio(resultadoEdificio);
          setPisos(resultadoPisos.filter((piso) => piso.estado === 'ACTIVO'));
          setEspacios(resultadoEspacios.filter((espacio) => espacio.estado === 'ACTIVO'));
        } else {
          const resultado = await campus.edificios.listar();

          if (!vigente) return;

          setEdificios(resultado.filter((e) => e.estado === 'ACTIVO'));
        }
      } catch (e) {
        if (vigente) {
          setError(e instanceof Error ? e.message : 'No fue posible cargar la información del campus.');
        }
      } finally {
        if (vigente) setCargando(false);
      }
    };

    void cargar();

    return () => {
      vigente = false;
    };
  }, [edificioId, puedeConsultar]);

  if (!puedeConsultar) {
    return (
      <>
        <PageHeader badge="CAMPUS" title="Edificios" subtitle="Consulta los edificios y sus espacios." />
        <main className="content">
          <p className="cs-alert stop">Tu rol no tiene permiso para consultar el campus.</p>
        </main>
      </>
    );
  }

  if (cargando) {
    return (
      <>
        <PageHeader badge="CAMPUS" title="Edificios" subtitle="Consulta los edificios y sus espacios." />
        <main className="content">
          <p className="cs-resumen">Cargando información…</p>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          badge="CAMPUS"
          title={edificio?.nombre ?? 'Edificios'}
          subtitle="Consulta la información del campus."
          context={edificioId ? <a className="cs-volver" href="#/edificios">← Edificios</a> : undefined}
        />
        <main className="content">
          <p className="cs-alert warn" role="alert">{error}</p>
        </main>
      </>
    );
  }

  if (!edificioId) {
    return (
      <>
        <PageHeader
          badge="CAMPUS"
          title="Edificios"
          subtitle="Explora los edificios del campus, sus fotografías y los espacios disponibles."
        />

        <main className="content">
          {edificios.length === 0 ? (
            <p className="cs-alert info">Todavía no hay edificios activos para consultar.</p>
          ) : (
            <div className="cs-estudiante-edificios">
              {edificios.map((item) => (
                <article className="cs-estudiante-edificio" key={item.id}>
                  <div className="cs-estudiante-edificio-info">
                    <h2>{item.nombre}</h2>
                    <p>{item.descripcion || 'Sin descripción disponible.'}</p>
                    <a className="cs-mini" href={`#/edificios/${item.id}`}>
                      Ver pisos y espacios
                    </a>
                  </div>

                  <GaleriaImagenes
                    tipoElemento="EDIFICIO"
                    elementoId={item.id}
                    editable={false}
                  />
                </article>
              ))}
            </div>
          )}
        </main>
      </>
    );
  }

  if (!edificio) return null;

  return (
    <>
      <PageHeader
        badge="CAMPUS"
        title={edificio.nombre}
        subtitle={edificio.descripcion || 'Pisos y espacios de este edificio.'}
        context={<a className="cs-volver" href="#/edificios">← Edificios</a>}
      />

      <main className="content">
        <div className="cs-estudiante-detalle">
          <div className="cs-estudiante-detalle-info">
            <div className="cs-estudiante-resumen">
              <h2 className="title sm22">Pisos y espacios</h2>
              <span className="cs-resumen">
                {pisos.length} {pisos.length === 1 ? 'piso' : 'pisos'} · {espacios.length} {espacios.length === 1 ? 'espacio' : 'espacios'}
              </span>
            </div>

            {pisos.length === 0 ? (
              <p className="cs-alert info">Este edificio todavía no tiene pisos activos.</p>
            ) : (
              <div className="cs-estudiante-pisos">
                {pisos.map((piso) => {
                  const espaciosDelPiso = espacios.filter((espacio) => espacio.pisoId === piso.id);

                  return (
                    <section className="cs-piso" key={piso.id}>
                      <h3 className="cs-piso-titulo">
                        Piso {piso.numero}{piso.nombre ? ` · ${piso.nombre}` : ''}
                      </h3>

                      {espaciosDelPiso.length === 0 ? (
                        <p className="cs-vacio">Este piso no tiene espacios activos.</p>
                      ) : (
                        <div className="cs-estudiante-espacios">
                          {espaciosDelPiso.map((espacio) => (
                            <article className="cs-estudiante-espacio" key={espacio.id}>
                              <div>
                                <h4>{espacio.nombre}</h4>
                                <span>{TIPOS[espacio.tipo]}</span>
                                <span className={`cs-estado ${espacio.disponible ? 'ok' : 'warn'}`}>
                                  {espacio.disponible ? 'DISPONIBLE' : 'NO DISPONIBLE'}
                                </span>
                              </div>

                              <GaleriaImagenes
                                tipoElemento="ESPACIO"
                                elementoId={espacio.id}
                                editable={false}
                              />
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="cs-estudiante-detalle-fotos" aria-label="Fotografías del edificio">
            <GaleriaImagenes
              tipoElemento="EDIFICIO"
              elementoId={edificio.id}
              editable={false}
              grande
            />
          </aside>
        </div>
      </main>
    </>
  );
}
