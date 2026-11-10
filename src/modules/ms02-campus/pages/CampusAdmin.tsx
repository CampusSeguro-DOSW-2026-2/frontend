import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { campus, CampusApiError, comoCampusError as comoError, rolesDeSesion } from '../services/campus';
import type { Campus, CampusRequest, TipoZonaAbierta, ZonaAbierta, ZonaAbiertaRequest } from '../types';
import { TIPOS_ZONA_ABIERTA } from '../types';
import { Botones, Campo, Falla } from '../components/comun';
import { useEnvio, type Errores } from '../hooks/useEnvio';
import { enlaceOsm, leerCoordenada, textoCoordenadas } from '../utils/coordenadas';
import { AyudaCoordenadas } from '../components/AyudaCoordenadas';
import '../styles/campus.css';
import '../styles/admin.css';

type Edicion =
  | { tipo: 'campus-nuevo' }
  | { tipo: 'campus'; id: string }
  | { tipo: 'zona-nueva'; campusId: string }
  | { tipo: 'zona'; id: string }
  | null;

const leer = async () => {
  const campuses = await campus.campuses.listar(true);
  const zonas = await Promise.all(campuses.map((c) => campus.zonasAbiertas.listarPorCampus(c.id, true)));
  return { campuses, zonas: new Map(campuses.map((c, i) => [c.id, zonas[i]])) };
};

type Datos = Awaited<ReturnType<typeof leer>>;

function CampusForm({ inicial, onGuardar, onCancelar }: {
  inicial?: Campus; onGuardar: (datos: CampusRequest) => Promise<void>; onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);
  const id = inicial?.id ?? 'nuevo';

  const validar = () => {
    const e: Errores = {};
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    else if (nombre.trim().length > 100) e.nombre = 'El nombre no puede superar 100 caracteres.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => { e.preventDefault(); enviar(validar(), { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined }); }}>
      <Campo id={`campus-nombre-${id}`} etiqueta="Nombre" error={errores.nombre}>
        <input id={`campus-nombre-${id}`} value={nombre} placeholder="Campus Autopista Norte" onChange={(e) => setNombre(e.target.value)} />
      </Campo>
      <Campo id={`campus-descripcion-${id}`} etiqueta="Descripción (opcional)" error={errores.descripcion}>
        <textarea id={`campus-descripcion-${id}`} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

function ZonaAbiertaForm({ inicial, onGuardar, onCancelar }: {
  inicial?: ZonaAbierta; onGuardar: (datos: ZonaAbiertaRequest) => Promise<void>; onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoZonaAbierta | ''>(inicial?.tipo ?? '');
  const [latitud, setLatitud] = useState(inicial?.latitud != null ? String(inicial.latitud) : '');
  const [longitud, setLongitud] = useState(inicial?.longitud != null ? String(inicial.longitud) : '');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);
  const id = inicial?.id ?? 'nueva';

  const validar = () => {
    const e: Errores = {};
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    else if (nombre.trim().length > 100) e.nombre = 'El nombre no puede superar 100 caracteres.';
    if (!tipo) e.tipo = 'Selecciona el tipo de zona.';
    const lat = leerCoordenada(latitud, 'latitud');
    const lon = leerCoordenada(longitud, 'longitud');
    if (typeof lat === 'string') e.latitud = lat;
    if (typeof lon === 'string') e.longitud = lon;
    if (lat === undefined && lon !== undefined) e.latitud = 'Escribe también la latitud.';
    if (lon === undefined && lat !== undefined) e.longitud = 'Escribe también la longitud.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), {
        nombre: nombre.trim(), tipo: tipo as TipoZonaAbierta,
        latitud: leerCoordenada(latitud, 'latitud') as number | undefined,
        longitud: leerCoordenada(longitud, 'longitud') as number | undefined,
      });
    }}>
      <div className="cs-campos">
        <Campo id={`abierta-nombre-${id}`} etiqueta="Nombre" error={errores.nombre}>
          <input id={`abierta-nombre-${id}`} value={nombre} placeholder="Plazoleta central" onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo id={`abierta-tipo-${id}`} etiqueta="Tipo" error={errores.tipo}>
          <select id={`abierta-tipo-${id}`} value={tipo} onChange={(e) => setTipo(e.target.value as TipoZonaAbierta | '')}>
            <option value="">Selecciona un tipo</option>
            {(Object.keys(TIPOS_ZONA_ABIERTA) as TipoZonaAbierta[]).map((t) => <option key={t} value={t}>{TIPOS_ZONA_ABIERTA[t]}</option>)}
          </select>
        </Campo>
      </div>
      <div className="cs-campos">
        <Campo id={`abierta-latitud-${id}`} etiqueta="Latitud (opcional)" error={errores.latitud}>
          <input id={`abierta-latitud-${id}`} inputMode="decimal" value={latitud} placeholder="4.78271" onChange={(e) => setLatitud(e.target.value)} />
        </Campo>
        <Campo id={`abierta-longitud-${id}`} etiqueta="Longitud (opcional)" error={errores.longitud}>
          <input id={`abierta-longitud-${id}`} inputMode="decimal" value={longitud} placeholder="-74.04263" onChange={(e) => setLongitud(e.target.value)} />
        </Campo>
      </div>
      <AyudaCoordenadas latitud={latitud} longitud={longitud}
        onElegir={(la, lo) => { setLatitud(String(la)); setLongitud(String(lo)); }} />
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

export default function CampusAdmin() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [errorCarga, setErrorCarga] = useState<CampusApiError | null>(null);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aviso, setAviso] = useState<CampusApiError | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const roles = rolesDeSesion();
  const puedeGestionar = roles === null || roles.includes('ADMIN');

  const aplicar = useCallback((d: Datos) => { setDatos(d); setErrorCarga(null); }, []);

  useEffect(() => {
    let vigente = true;
    leer()
      .then((d) => { if (vigente) aplicar(d); })
      .catch((e) => { if (vigente) setErrorCarga(comoError(e)); });
    return () => { vigente = false; };
  }, [aplicar]);

  const recargar = async () => {
    try {
      aplicar(await leer());
    } catch (e) {
      setErrorCarga(comoError(e));
    }
  };

  const editar = (e: Edicion) => { setEdicion(e); setAviso(null); };

  const guardar = async (accion: () => Promise<unknown>) => {
    await accion();
    await recargar();
    setEdicion(null);
  };

  // El backend responde 422 cuando hay zonas activas que impiden inactivar: se muestra tal cual.
  const cambiarEstado = async (id: string, activo: boolean, accion: { inactivar: () => Promise<unknown>; reactivar: () => Promise<unknown> }) => {
    setOcupado(id);
    setAviso(null);
    try {
      await (activo ? accion.inactivar() : accion.reactivar());
      await recargar();
    } catch (e) {
      setAviso(comoError(e));
    } finally {
      setOcupado(null);
    }
  };

  const cabecera = <PageHeader badge="ADMINISTRACIÓN" title="Campus y zonas abiertas" subtitle="Gestiona los campus y sus zonas abiertas: zonas verdes, plazoletas, canchas y parqueaderos." />;

  if (!datos) {
    return (
      <>
        {cabecera}
        <main className="content">{errorCarga ? <Falla error={errorCarga} /> : <p className="cs-resumen">Cargando campus…</p>}</main>
      </>
    );
  }

  return (
    <>
      {cabecera}
      <main className="content">
        {errorCarga && <Falla error={errorCarga} />}
        {aviso && <Falla error={aviso} />}

        <div className="cs-barra">
          <div className="cs-barra-titulo">
            <h2 className="title sm22">Campus</h2>
            <span className="cs-resumen">{datos.campuses.length} {datos.campuses.length === 1 ? 'campus registrado' : 'campus registrados'}</span>
          </div>
          {puedeGestionar && <button type="button" className="btn red cs-agregar" onClick={() => editar({ tipo: 'campus-nuevo' })}>Crear campus</button>}
        </div>

        {edicion?.tipo === 'campus-nuevo' && (
          <section className="cs-piso">
            <h3 className="cs-piso-titulo">Nuevo campus</h3>
            <CampusForm onCancelar={() => editar(null)} onGuardar={(d) => guardar(() => campus.campuses.crear(d))} />
          </section>
        )}

        {datos.campuses.length === 0 && edicion?.tipo !== 'campus-nuevo' && <p className="cs-alert info">Todavía no hay campus registrados.</p>}

        {datos.campuses.map((c) => {
          const activo = c.estado === 'ACTIVO';
          const zonas = datos.zonas.get(c.id) ?? [];
          return (
            <section key={c.id} className={`cs-piso${activo ? '' : ' inactivo'}`}>
              {edicion?.tipo === 'campus' && edicion.id === c.id ? (
                <CampusForm inicial={c} onCancelar={() => editar(null)} onGuardar={(d) => guardar(() => campus.campuses.modificar(c.id, d))} />
              ) : (
                <div className="cs-piso-cabecera">
                  <h3 className="cs-piso-titulo">
                    {c.nombre}
                    <span className={`cs-estado ${activo ? 'ok' : 'info'}`}>{c.estado}</span>
                    {c.descripcion && <span>{c.descripcion}</span>}
                  </h3>
                  {puedeGestionar && (
                    <div className="cs-acciones">
                      {activo && <button type="button" className="cs-mini" onClick={() => editar({ tipo: 'campus', id: c.id })}>Modificar</button>}
                      {activo && <button type="button" className="cs-mini" onClick={() => editar({ tipo: 'zona-nueva', campusId: c.id })}>Agregar zona abierta</button>}
                      <button type="button" className={`cs-mini${activo ? ' peligro' : ''}`} disabled={ocupado === c.id}
                        onClick={() => cambiarEstado(c.id, activo, { inactivar: () => campus.campuses.inactivar(c.id), reactivar: () => campus.campuses.reactivar(c.id) })}>
                        {ocupado === c.id ? 'Guardando…' : activo ? 'Inactivar' : 'Reactivar'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {edicion?.tipo === 'zona-nueva' && edicion.campusId === c.id && (
                <div className="cs-subeditor">
                  <h4>Nueva zona abierta en {c.nombre}</h4>
                  <ZonaAbiertaForm onCancelar={() => editar(null)} onGuardar={(d) => guardar(() => campus.zonasAbiertas.crear(c.id, d))} />
                </div>
              )}

              {zonas.length === 0 ? (
                <p className="cs-vacio">Este campus todavía no tiene zonas abiertas.</p>
              ) : (
                <div className="cs-tabla">
                  <table>
                    <thead><tr><th>Nombre</th><th>Tipo</th><th>Coordenadas</th><th>Estado</th><th><span className="cs-oculto">Acciones</span></th></tr></thead>
                    <tbody>
                      {zonas.map((z) => {
                        const zonaActiva = z.estado === 'ACTIVO';
                        if (edicion?.tipo === 'zona' && edicion.id === z.id) {
                          return (
                            <tr key={z.id}><td colSpan={5}>
                              <ZonaAbiertaForm inicial={z} onCancelar={() => editar(null)} onGuardar={(d) => guardar(() => campus.zonasAbiertas.modificar(z.id, d))} />
                            </td></tr>
                          );
                        }
                        return (
                          <tr key={z.id} className={zonaActiva ? '' : 'inactivo'}>
                            <td>{z.nombre}</td>
                            <td>{TIPOS_ZONA_ABIERTA[z.tipo]}</td>
                            <td>
                              {z.latitud != null && z.longitud != null ? (
                                <>
                                  {textoCoordenadas(z.latitud, z.longitud)}
                                  <a className="cs-sub" href={enlaceOsm(z.latitud, z.longitud)} target="_blank" rel="noopener noreferrer">Ver en OpenStreetMap</a>
                                </>
                              ) : '—'}
                            </td>
                            <td><span className={`cs-estado ${zonaActiva ? 'ok' : 'info'}`}>{z.estado}</span></td>
                            <td>
                              {puedeGestionar && (
                                <div className="cs-acciones">
                                  {zonaActiva && <button type="button" className="cs-mini" onClick={() => editar({ tipo: 'zona', id: z.id })}>Modificar</button>}
                                  <button type="button" className={`cs-mini${zonaActiva ? ' peligro' : ''}`} disabled={ocupado === z.id}
                                    onClick={() => cambiarEstado(z.id, zonaActiva, { inactivar: () => campus.zonasAbiertas.inactivar(z.id), reactivar: () => campus.zonasAbiertas.reactivar(z.id) })}>
                                    {ocupado === z.id ? 'Guardando…' : zonaActiva ? 'Inactivar' : 'Reactivar'}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
