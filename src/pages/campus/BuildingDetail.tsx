import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../components/Layout';
import { campus, CampusApiError, comoCampusError as comoError } from '../../services/campus';
import type { Edificio, Espacio, EspacioRequest, Piso, PisoRequest, TipoEspacio } from '../../types/campus';
import { Campo, Falla } from './comun';
import './campus.css';

const TIPOS: Record<TipoEspacio, string> = {
  SALON: 'Salón',
  LABORATORIO: 'Laboratorio',
  AUDITORIO: 'Auditorio',
  OFICINA: 'Oficina',
  ESPACIO_COMUN: 'Espacio común',
};

type Edicion =
  | { tipo: 'nuevo-piso' }
  | { tipo: 'piso'; id: string }
  | { tipo: 'nuevo-espacio'; pisoId: string }
  | { tipo: 'espacio'; id: string }
  | null;

type Errores = Record<string, string>;

function useEnvio<T>(guardar: (datos: T) => Promise<void>) {
  const [errores, setErrores] = useState<Errores>({});
  const [general, setGeneral] = useState<CampusApiError | null>(null);
  const [guardando, setGuardando] = useState(false);

  const enviar = async (locales: Errores, datos: T) => {
    setErrores(locales);
    setGeneral(null);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    try {
      await guardar(datos);
    } catch (e) {
      const error = comoError(e);
      setErrores(error.campos);
      if (!Object.keys(error.campos).length) setGeneral(error);
    } finally {
      setGuardando(false);
    }
  };
  return { errores, general, guardando, enviar };
}

function Botones({ guardando, onCancelar }: { guardando: boolean; onCancelar: () => void }) {
  return (
    <div className="cs-form-botones">
      <button type="submit" className="cs-mini primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      <button type="button" className="cs-mini" onClick={onCancelar} disabled={guardando}>Cancelar</button>
    </div>
  );
}

function PisoForm({ inicial, onGuardar, onCancelar }: {
  inicial?: Piso; onGuardar: (datos: PisoRequest) => Promise<void>; onCancelar: () => void;
}) {
  const [numero, setNumero] = useState(inicial ? String(inicial.numero) : '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);
  const id = inicial?.id ?? 'nuevo';

  const validar = () => {
    const e: Errores = {};
    if (!/^-?\d+$/.test(numero.trim())) e.numero = 'Escribe el número del piso, por ejemplo 1 o -1 para un sótano.';
    if (nombre.trim().length > 100) e.nombre = 'El nombre no puede superar 100 caracteres.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), { numero: Number(numero.trim()), nombre: nombre.trim() || undefined });
    }}>
      <div className="cs-campos">
        <Campo id={`piso-numero-${id}`} etiqueta="Número" error={errores.numero}>
          <input id={`piso-numero-${id}`} inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </Campo>
        <Campo id={`piso-nombre-${id}`} etiqueta="Nombre (opcional)" error={errores.nombre}>
          <input id={`piso-nombre-${id}`} value={nombre} placeholder="Primer piso" onChange={(e) => setNombre(e.target.value)} />
        </Campo>
      </div>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

function EspacioForm({ inicial, onGuardar, onCancelar }: {
  inicial?: Espacio; onGuardar: (datos: EspacioRequest) => Promise<void>; onCancelar: () => void;
}) {
  const [codigo, setCodigo] = useState(inicial?.codigo ?? '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoEspacio | ''>(inicial?.tipo ?? '');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);
  const id = inicial?.id ?? 'nuevo';

  const validar = () => {
    const e: Errores = {};
    if (!inicial && !codigo.trim()) e.codigo = 'El código es obligatorio.';
    else if (codigo.trim().length > 50) e.codigo = 'El código no puede superar 50 caracteres.';
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    else if (nombre.trim().length > 100) e.nombre = 'El nombre no puede superar 100 caracteres.';
    if (!tipo) e.tipo = 'Selecciona el tipo de espacio.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), { codigo: codigo.trim(), nombre: nombre.trim(), tipo: tipo as TipoEspacio });
    }}>
      <div className="cs-campos">
        <Campo id={`espacio-codigo-${id}`} etiqueta={inicial ? 'Código (no se puede cambiar)' : 'Código'} error={errores.codigo}>
          <input id={`espacio-codigo-${id}`} value={codigo} placeholder="G-101" disabled={!!inicial} onChange={(e) => setCodigo(e.target.value)} />
        </Campo>
        <Campo id={`espacio-nombre-${id}`} etiqueta="Nombre" error={errores.nombre}>
          <input id={`espacio-nombre-${id}`} value={nombre} placeholder="Laboratorio de redes" onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo id={`espacio-tipo-${id}`} etiqueta="Tipo" error={errores.tipo}>
          <select id={`espacio-tipo-${id}`} value={tipo} onChange={(e) => setTipo(e.target.value as TipoEspacio)}>
            <option value="">Selecciona un tipo</option>
            {Object.entries(TIPOS).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
        </Campo>
      </div>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

const leer = (edificioId: string) => Promise.all([
  campus.edificios.obtener(edificioId),
  campus.pisos.listarPorEdificio(edificioId, true),
  campus.espacios.listarPorEdificio(edificioId, true),
]);

type Datos = Awaited<ReturnType<typeof leer>>;

function estadoEspacio(espacio: Espacio) {
  if (espacio.estado === 'INACTIVO') return <span className="cs-estado info">INACTIVO</span>;
  if (!espacio.disponible) return <span className="cs-estado warn">NO DISPONIBLE</span>;
  return <span className="cs-estado ok">ACTIVO</span>;
}

export default function BuildingDetail({ edificioId }: { edificioId: string }) {
  const [edificio, setEdificio] = useState<Edificio | null>(null);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [errorCarga, setErrorCarga] = useState<CampusApiError | null>(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aviso, setAviso] = useState<{ pisoId: string; error: CampusApiError } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const aplicar = useCallback(([e, p, s]: Datos) => {
    setEdificio(e);
    setPisos(p);
    setEspacios(s);
    setErrorCarga(null);
  }, []);

  useEffect(() => {
    let vigente = true;
    leer(edificioId)
      .then((datos) => { if (vigente) aplicar(datos); })
      .catch((e) => { if (vigente) setErrorCarga(comoError(e)); });
    return () => { vigente = false; };
  }, [edificioId, aplicar]);

  const cargar = async () => {
    try {
      aplicar(await leer(edificioId));
    } catch (e) {
      setErrorCarga(comoError(e));
    }
  };

  const editar = (e: Edicion) => { setEdicion(e); setAviso(null); };

  const guardar = async (accion: () => Promise<unknown>) => {
    await accion();
    setEdicion(null);
    await cargar();
  };

  const cambiarEstado = async (clave: string, pisoId: string, accion: () => Promise<unknown>) => {
    setOcupado(clave);
    setAviso(null);
    try {
      await accion();
      await cargar();
    } catch (e) {
      setAviso({ pisoId, error: comoError(e) });
    } finally {
      setOcupado(null);
    }
  };

  if (!edificio) {
    return (
      <>
        <PageHeader badge="ADMINISTRACIÓN" title="Detalle de edificio" subtitle="Pisos y espacios del edificio." />
        <main className="content">
          {errorCarga ? <Falla error={errorCarga} /> : <p className="cs-resumen">Cargando edificio…</p>}
        </main>
      </>
    );
  }

  const visibles = (e: { estado: string }) => mostrarInactivos || e.estado === 'ACTIVO';
  const pisosVisibles = pisos.filter(visibles);
  const pisosActivos = pisos.filter((p) => p.estado === 'ACTIVO').length;
  const espaciosActivos = espacios.filter((s) => s.estado === 'ACTIVO').length;
  const inactivos = pisos.length - pisosActivos + espacios.length - espaciosActivos;

  return (
    <>
      <PageHeader badge="ADMINISTRACIÓN" title={edificio.nombre}
        subtitle={[`Código ${edificio.codigo}`, edificio.descripcion].filter(Boolean).join(' · ')}
        context={<a className="cs-volver" href="#/admin/edificios">← Edificios</a>} />
      <main className="content">
        {edificio.estado === 'INACTIVO' && (
          <p className="cs-alert warn">Este edificio está inactivo, así que sus pisos y espacios no están disponibles para rutas. Reactívalo desde Edificios para poder modificarlos.</p>
        )}
        {errorCarga && <Falla error={errorCarga} />}

        <div className="cs-barra">
          <div className="cs-barra-titulo">
            <h2 className="title sm22">Pisos y espacios</h2>
            <span className="cs-resumen">
              {pisosActivos} {pisosActivos === 1 ? 'piso activo' : 'pisos activos'} · {espaciosActivos} {espaciosActivos === 1 ? 'espacio activo' : 'espacios activos'}
            </span>
          </div>
          <label className="cs-check">
            <input type="checkbox" checked={mostrarInactivos} onChange={(e) => setMostrarInactivos(e.target.checked)} />
            Mostrar inactivos{inactivos > 0 && ` (${inactivos})`}
          </label>
          {edificio.estado === 'ACTIVO' && (
            <button type="button" className="btn red cs-agregar" onClick={() => editar({ tipo: 'nuevo-piso' })}>Agregar piso</button>
          )}
        </div>

        {edicion?.tipo === 'nuevo-piso' && (
          <section className="cs-piso">
            <h3 className="cs-piso-titulo">Nuevo piso</h3>
            <PisoForm onCancelar={() => editar(null)}
              onGuardar={(datos) => guardar(() => campus.pisos.crear(edificioId, datos))} />
          </section>
        )}

        {pisosVisibles.length === 0 && edicion?.tipo !== 'nuevo-piso' && (
          <p className="cs-alert info">
            {pisos.length === 0 ? 'Este edificio todavía no tiene pisos. Agrega el primero para registrar sus espacios.' : 'Todos los pisos están inactivos. Marca «Mostrar inactivos» para verlos.'}
          </p>
        )}

        {pisosVisibles.map((piso) => {
          const activo = piso.estado === 'ACTIVO';
          const delPiso = espacios.filter((s) => s.pisoId === piso.id && visibles(s));
          return (
            <section key={piso.id} className={`cs-piso${activo ? '' : ' inactivo'}`} aria-labelledby={`piso-${piso.id}`}>
              {edicion?.tipo === 'piso' && edicion.id === piso.id ? (
                <>
                  <h3 className="cs-piso-titulo" id={`piso-${piso.id}`}>Modificar piso {piso.numero}</h3>
                  <PisoForm inicial={piso} onCancelar={() => editar(null)}
                    onGuardar={(datos) => guardar(() => campus.pisos.modificar(piso.id, datos))} />
                </>
              ) : (
                <div className="cs-piso-cabecera">
                  <h3 className="cs-piso-titulo" id={`piso-${piso.id}`}>
                    Piso {piso.numero}{piso.nombre && <span> · {piso.nombre}</span>}
                    {!activo && <span className="cs-estado info">INACTIVO</span>}
                  </h3>
                  <div className="cs-acciones">
                    {activo && edificio.estado === 'ACTIVO' && (
                      <button type="button" className="cs-mini" onClick={() => editar({ tipo: 'nuevo-espacio', pisoId: piso.id })}>Agregar espacio</button>
                    )}
                    {activo && <button type="button" className="cs-mini" onClick={() => editar({ tipo: 'piso', id: piso.id })}>Modificar</button>}
                    <button type="button" className={`cs-mini${activo ? ' peligro' : ''}`} disabled={ocupado === piso.id}
                      onClick={() => cambiarEstado(piso.id, piso.id, () => (activo ? campus.pisos.inactivar(piso.id) : campus.pisos.reactivar(piso.id)))}>
                      {ocupado === piso.id ? 'Guardando…' : activo ? 'Inactivar' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              )}

              {aviso?.pisoId === piso.id && <Falla error={aviso.error} />}

              {edicion?.tipo === 'nuevo-espacio' && edicion.pisoId === piso.id && (
                <div className="cs-subeditor">
                  <h4>Nuevo espacio en el piso {piso.numero}</h4>
                  <EspacioForm onCancelar={() => editar(null)}
                    onGuardar={(datos) => guardar(() => campus.espacios.crear(piso.id, datos))} />
                </div>
              )}

              {delPiso.length === 0 ? (
                <p className="cs-vacio">{activo ? 'Este piso no tiene espacios activos.' : 'Este piso no tiene espacios para mostrar.'}</p>
              ) : (
                <div className="cs-tabla">
                  <table>
                    <thead><tr><th>Código</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th><span className="cs-oculto">Acciones</span></th></tr></thead>
                    <tbody>
                      {delPiso.map((espacio) => {
                        const espacioActivo = espacio.estado === 'ACTIVO';
                        if (edicion?.tipo === 'espacio' && edicion.id === espacio.id) {
                          return (
                            <tr key={espacio.id}><td colSpan={5}>
                              <EspacioForm inicial={espacio} onCancelar={() => editar(null)}
                                onGuardar={(datos) => guardar(() => campus.espacios.modificar(espacio.id, { nombre: datos.nombre, tipo: datos.tipo }))} />
                            </td></tr>
                          );
                        }
                        return (
                          <tr key={espacio.id} className={espacioActivo ? '' : 'inactivo'}>
                            <td className="cs-codigo">{espacio.codigo}</td>
                            <td>{espacio.nombre}</td>
                            <td>{TIPOS[espacio.tipo]}</td>
                            <td>{estadoEspacio(espacio)}</td>
                            <td>
                              <div className="cs-acciones">
                                {espacioActivo && <button type="button" className="cs-mini" onClick={() => editar({ tipo: 'espacio', id: espacio.id })}>Modificar</button>}
                                <button type="button" className={`cs-mini${espacioActivo ? ' peligro' : ''}`} disabled={ocupado === espacio.id}
                                  onClick={() => cambiarEstado(espacio.id, piso.id, () => (espacioActivo ? campus.espacios.inactivar(espacio.id) : campus.espacios.reactivar(espacio.id)))}>
                                  {ocupado === espacio.id ? 'Guardando…' : espacioActivo ? 'Inactivar' : 'Reactivar'}
                                </button>
                              </div>
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
