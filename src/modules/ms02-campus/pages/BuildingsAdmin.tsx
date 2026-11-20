import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { campus, CampusApiError, comoCampusError as comoError, currentPermissions } from '../services/campus';
import type { Campus, Edificio, EdificioRequest } from '../types';
import { Falla } from '../components/comun';
import EdificioForm from '../components/EdificioForm';
import GaleriaImagenes from '../components/GaleriaImagenes';
import { Paginacion } from '../components/Paginacion';
import { paginar } from '../utils/paginacion';
import '../styles/campus.css';
import '../styles/admin.css';

type Filtro = 'TODOS' | 'ACTIVO' | 'INACTIVO';

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'TODOS', texto: 'Todos' },
  { valor: 'ACTIVO', texto: 'Activos' },
  { valor: 'INACTIVO', texto: 'Inactivos' },
];

const POR_PAGINA = 10;
const FOTOS_EN_VISTA_PREVIA = 2;

/**
 * Vista general de edificios: una tabla corta con un solo botón «Modificar» por edificio. Todo lo demás (datos,
 * inactivar o reactivar, todas las fotos, pisos, espacios, escaleras, salidas y QR) está en la pantalla del edificio.
 */
export default function BuildingsAdmin() {
  const [edificios, setEdificios] = useState<Edificio[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<CampusApiError | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('ACTIVO');
  const [pagina, setPagina] = useState(0);
  const [creando, setCreando] = useState(false);
  const [campuses, setCampuses] = useState<Campus[] | null>(null);
  const [errorCampus, setErrorCampus] = useState<CampusApiError | null>(null);

  const permissions = currentPermissions();
  const puedeGestionar = permissions.includes(PERMISSION.MS02_BUILDING_WRITE);

  const aplicar = useCallback((lista: Edificio[]) => { setEdificios(lista); setErrorCarga(null); }, []);

  useEffect(() => {
    let vigente = true;
    campus.edificios.listar(true)
      .then((lista) => { if (vigente) aplicar(lista); })
      .catch((e) => { if (vigente) setErrorCarga(comoError(e)); });
    return () => { vigente = false; };
  }, [aplicar]);

  // Todo edificio pertenece a un campus: sin la lista no se puede crear.
  useEffect(() => {
    let vigente = true;
    campus.campuses.listar(true)
      .then((lista) => { if (vigente) setCampuses(lista); })
      .catch((e) => { if (vigente) setErrorCampus(comoError(e)); });
    return () => { vigente = false; };
  }, []);

  const crear = async (datos: EdificioRequest) => {
    await campus.edificios.crear(datos);
    aplicar(await campus.edificios.listar(true));
    setCreando(false);
  };

  const cabecera = <PageHeader badge="ADMINISTRACIÓN" title="Edificios" subtitle="Gestiona los edificios del campus y entra a sus pisos y espacios." />;

  if (!edificios) {
    return (
      <>
        {cabecera}
        <main className="content">
          {errorCarga ? <Falla error={errorCarga} /> : <p className="cs-resumen">Cargando edificios…</p>}
        </main>
      </>
    );
  }

  const activos = edificios.filter((e) => e.estado === 'ACTIVO').length;
  const inactivos = edificios.length - activos;
  const conteo: Record<Filtro, number> = { TODOS: edificios.length, ACTIVO: activos, INACTIVO: inactivos };
  const filtrados = edificios
    .filter((e) => filtro === 'TODOS' || e.estado === filtro)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const { items, actual, paginas } = paginar(filtrados, pagina, POR_PAGINA);
  const hayCampusActivo = !!campuses?.some((c) => c.estado === 'ACTIVO');
  const nombreCampus = (id: string) => campuses?.find((c) => c.id === id)?.nombre ?? '—';

  return (
    <>
      {cabecera}
      <main className="content">
        {errorCarga && <Falla error={errorCarga} />}
        {errorCampus && (
          <p className="cs-alert stop" role="alert">
            No se pudieron cargar los campus, así que no puedes crear edificios. {errorCampus.message}
            {errorCampus.correlationId && <small>Código para soporte: {errorCampus.correlationId}</small>}
          </p>
        )}
        {puedeGestionar && campuses && !hayCampusActivo && (
          <p className="cs-alert info">
            Para crear edificios primero registra un campus activo en <a href="#/admin/campus">Campus y zonas abiertas</a>.
          </p>
        )}

        <div className="cs-barra">
          <div className="cs-barra-titulo">
            <h2 className="title sm22">Edificios del campus</h2>
            <span className="cs-resumen">
              {activos} {activos === 1 ? 'activo' : 'activos'} · {inactivos} {inactivos === 1 ? 'inactivo' : 'inactivos'}
            </span>
          </div>
          <div className="cs-filtro-estado" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button key={f.valor} type="button" className="cs-pildora" aria-pressed={filtro === f.valor}
                onClick={() => { setFiltro(f.valor); setPagina(0); }}>
                {f.texto} ({conteo[f.valor]})
              </button>
            ))}
          </div>
          <a className="cs-mini" href="#/admin/campus">Campus y zonas abiertas</a>
          {puedeGestionar && (
            <button type="button" className="btn red cs-agregar" disabled={!hayCampusActivo} onClick={() => setCreando(true)}>Crear edificio</button>
          )}
        </div>

        {creando && campuses && (
          <section className="cs-piso">
            <h3 className="cs-piso-titulo">Nuevo edificio</h3>
            <EdificioForm campuses={campuses} onCancelar={() => setCreando(false)} onGuardar={crear} />
          </section>
        )}

        {filtrados.length === 0 && !creando ? (
          <p className="cs-alert info">
            {edificios.length === 0
              ? 'Todavía no hay edificios registrados.'
              : 'No hay edificios con este filtro. Prueba con «Todos».'}
          </p>
        ) : filtrados.length > 0 && (
          <>
            <div className="cs-tabla">
              <table>
                <thead>
                  <tr><th>Nombre</th><th>Campus</th><th>Fotografías</th><th>Estado</th><th><span className="cs-oculto">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {items.map((edificio) => {
                    const activo = edificio.estado === 'ACTIVO';
                    const href = `#/admin/edificios/${edificio.id}`;
                    return (
                      <tr key={edificio.id} className={activo ? '' : 'inactivo'}>
                        <td>
                          <span className="cs-codigo">{edificio.nombre}</span>
                          {edificio.descripcion && <span className="cs-descripcion-corta" title={edificio.descripcion}>{edificio.descripcion}</span>}
                        </td>
                        <td>{nombreCampus(edificio.campusId)}</td>
                        <td>
                          <GaleriaImagenes tipoElemento="EDIFICIO" elementoId={edificio.id} editable={false} compacta
                            maximo={FOTOS_EN_VISTA_PREVIA} verTodasHref={href} />
                        </td>
                        <td><span className={`cs-estado ${activo ? 'ok' : 'info'}`}>{edificio.estado}</span></td>
                        <td>
                          <div className="cs-acciones">
                            <a className="cs-mini" href={href}>Modificar</a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Paginacion actual={actual} paginas={paginas} total={filtrados.length} nombre="edificios" onCambiar={setPagina} />
          </>
        )}
      </main>
    </>
  );
}
