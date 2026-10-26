import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../components/Layout';
import { campus, CampusApiError, comoCampusError as comoError, rolesDeSesion } from '../../services/campus';
import type { CrearRutaRequest, Edificio, Espacio, EstadoRuta, Ruta, ZonaSegura } from '../../types/campus';
import { Botones, Campo, Falla } from './comun';
import { useEnvio, type Errores } from './useEnvio';
import './campus.css';

const ESTADOS: Record<EstadoRuta, { texto: string; tono: string }> = {
  DISPONIBLE: { texto: 'DISPONIBLE', tono: 'ok' },
  RESTRINGIDA: { texto: 'RESTRINGIDA', tono: 'warn' },
  BLOQUEADA: { texto: 'BLOQUEADA', tono: 'stop' },
};

type Edicion = { tipo: 'nueva' } | { tipo: 'modificar'; id: string } | { tipo: 'estado'; id: string } | null;

const leer = async () => {
  const [rutas, edificios, zonas] = await Promise.all([
    campus.rutas.listar(),
    campus.edificios.listar(true),
    campus.zonas.listar(true),
  ]);
  const espacios = (await Promise.all(edificios.map((e) => campus.espacios.listarPorEdificio(e.id, true)))).flat();
  return { rutas, edificios, zonas, espacios };
};

type Datos = Awaited<ReturnType<typeof leer>>;

const fecha = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function validarMotivo(estado: EstadoRuta | '', motivo: string, errores: Errores) {
  if (!estado) errores.estado = 'Selecciona el estado de la ruta.';
  else if (estado !== 'DISPONIBLE' && !motivo.trim()) errores.motivo = 'Escribe el motivo: es obligatorio si la ruta queda bloqueada o restringida.';
  if (motivo.trim().length > 255) errores.motivo = 'El motivo no puede superar 255 caracteres.';
}

function CamposEstado({ id, estado, motivo, errores, onEstado, onMotivo }: {
  id: string; estado: EstadoRuta | ''; motivo: string; errores: Errores;
  onEstado: (v: EstadoRuta | '') => void; onMotivo: (v: string) => void;
}) {
  return (
    <>
      <Campo id={`ruta-estado-${id}`} etiqueta="Estado" error={errores.estado}>
        <select id={`ruta-estado-${id}`} value={estado} onChange={(e) => onEstado(e.target.value as EstadoRuta | '')}>
          <option value="">Selecciona un estado</option>
          <option value="DISPONIBLE">Disponible</option>
          <option value="RESTRINGIDA">Restringida</option>
          <option value="BLOQUEADA">Bloqueada</option>
        </select>
      </Campo>
      {estado && estado !== 'DISPONIBLE' && (
        <Campo id={`ruta-motivo-${id}`} etiqueta="Motivo" error={errores.motivo}>
          <input id={`ruta-motivo-${id}`} value={motivo} maxLength={255} placeholder="Escalera norte en mantenimiento" onChange={(e) => onMotivo(e.target.value)} />
        </Campo>
      )}
    </>
  );
}

function NuevaRuta({ datos, onGuardar, onCancelar }: {
  datos: Datos; onGuardar: (r: CrearRutaRequest) => Promise<void>; onCancelar: () => void;
}) {
  const [edificioId, setEdificioId] = useState('');
  const [espacioId, setEspacioId] = useState('');
  const [zonaId, setZonaId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState<EstadoRuta | ''>('DISPONIBLE');
  const [motivo, setMotivo] = useState('');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);

  const conRuta = new Set(datos.rutas.map((r) => r.espacioOrigenId));
  const espaciosLibres = datos.espacios.filter((s) => s.edificioId === edificioId && s.disponible && !conRuta.has(s.id));
  const zonasActivas = datos.zonas.filter((z) => z.estado === 'ACTIVO');

  const validar = () => {
    const e: Errores = {};
    if (!espacioId) e.espacioOrigenId = 'Selecciona el espacio de origen.';
    if (!zonaId) e.zonaSeguraDestinoId = 'Selecciona la zona segura de destino.';
    if (!descripcion.trim()) e.descripcion = 'Describe el recorrido.';
    else if (descripcion.trim().length > 1000) e.descripcion = 'El recorrido no puede superar 1000 caracteres.';
    validarMotivo(estado, motivo, e);
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), {
        espacioOrigenId: espacioId, zonaSeguraDestinoId: zonaId, descripcion: descripcion.trim(),
        estado: estado as EstadoRuta, motivo: estado === 'DISPONIBLE' ? undefined : motivo.trim(),
      });
    }}>
      <div className="cs-campos">
        <Campo id="ruta-edificio-nueva" etiqueta="Edificio">
          <select id="ruta-edificio-nueva" value={edificioId} onChange={(e) => { setEdificioId(e.target.value); setEspacioId(''); }}>
            <option value="">Selecciona un edificio</option>
            {datos.edificios.filter((e) => e.estado === 'ACTIVO').map((e) => <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>)}
          </select>
        </Campo>
        <Campo id="ruta-espacio-nueva" etiqueta="Espacio de origen" error={errores.espacioOrigenId}>
          <select id="ruta-espacio-nueva" value={espacioId} disabled={!edificioId} onChange={(e) => setEspacioId(e.target.value)}>
            <option value="">{edificioId && espaciosLibres.length === 0 ? 'Todos los espacios ya tienen ruta' : 'Selecciona un espacio'}</option>
            {espaciosLibres.map((s) => <option key={s.id} value={s.id}>{s.codigo} · {s.nombre}</option>)}
          </select>
        </Campo>
        <Campo id="ruta-zona-nueva" etiqueta="Zona segura de destino" error={errores.zonaSeguraDestinoId}>
          <select id="ruta-zona-nueva" value={zonaId} onChange={(e) => setZonaId(e.target.value)}>
            <option value="">Selecciona una zona</option>
            {zonasActivas.map((z) => <option key={z.id} value={z.id}>{z.codigo} · {z.nombre}</option>)}
          </select>
        </Campo>
      </div>
      <Campo id="ruta-descripcion-nueva" etiqueta="Recorrido" error={errores.descripcion}>
        <textarea id="ruta-descripcion-nueva" rows={3} value={descripcion} placeholder="Sal por la puerta principal, gira a la derecha y baja por la escalera norte." onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>
      <div className="cs-campos">
        <CamposEstado id="nueva" estado={estado} motivo={motivo} errores={errores} onEstado={setEstado} onMotivo={setMotivo} />
      </div>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

function ModificarRuta({ ruta, zonas, onGuardar, onCancelar }: {
  ruta: Ruta; zonas: ZonaSegura[]; onGuardar: (zonaId: string, descripcion: string) => Promise<void>; onCancelar: () => void;
}) {
  const [zonaId, setZonaId] = useState(ruta.zonaSeguraDestinoId);
  const [descripcion, setDescripcion] = useState(ruta.descripcion);
  const { errores, general, guardando, enviar } = useEnvio((d: { zona: string; descripcion: string }) => onGuardar(d.zona, d.descripcion));
  const opciones = zonas.filter((z) => z.estado === 'ACTIVO' || z.id === ruta.zonaSeguraDestinoId);

  const validar = () => {
    const e: Errores = {};
    if (!zonaId) e.zonaSeguraDestinoId = 'Selecciona la zona segura de destino.';
    if (!descripcion.trim()) e.descripcion = 'Describe el recorrido.';
    else if (descripcion.trim().length > 1000) e.descripcion = 'El recorrido no puede superar 1000 caracteres.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => { e.preventDefault(); enviar(validar(), { zona: zonaId, descripcion: descripcion.trim() }); }}>
      <Campo id={`ruta-zona-${ruta.id}`} etiqueta="Zona segura de destino" error={errores.zonaSeguraDestinoId}>
        <select id={`ruta-zona-${ruta.id}`} value={zonaId} onChange={(e) => setZonaId(e.target.value)}>
          {opciones.map((z) => <option key={z.id} value={z.id}>{z.codigo} · {z.nombre}{z.estado === 'INACTIVO' ? ' (inactiva)' : ''}</option>)}
        </select>
      </Campo>
      <Campo id={`ruta-descripcion-${ruta.id}`} etiqueta="Recorrido" error={errores.descripcion}>
        <textarea id={`ruta-descripcion-${ruta.id}`} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

function CambiarEstado({ ruta, onGuardar, onCancelar }: {
  ruta: Ruta; onGuardar: (estado: EstadoRuta, motivo?: string) => Promise<void>; onCancelar: () => void;
}) {
  const [estado, setEstado] = useState<EstadoRuta | ''>(ruta.estado);
  const [motivo, setMotivo] = useState(ruta.motivo ?? '');
  const { errores, general, guardando, enviar } = useEnvio((d: { estado: EstadoRuta; motivo?: string }) => onGuardar(d.estado, d.motivo));

  const validar = () => {
    const e: Errores = {};
    validarMotivo(estado, motivo, e);
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), { estado: estado as EstadoRuta, motivo: estado === 'DISPONIBLE' ? undefined : motivo.trim() });
    }}>
      <div className="cs-campos">
        <CamposEstado id={ruta.id} estado={estado} motivo={motivo} errores={errores} onEstado={setEstado} onMotivo={setMotivo} />
      </div>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

export default function RoutesAdmin() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [errorCarga, setErrorCarga] = useState<CampusApiError | null>(null);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [filtroEdificio, setFiltroEdificio] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoRuta | ''>('');

  const roles = rolesDeSesion();
  const puedeGestionar = roles === null || roles.includes('ADMIN');
  const puedeCambiarEstado = roles === null || roles.includes('ADMIN') || roles.includes('COORDINADOR');

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

  const guardar = async (accion: () => Promise<unknown>) => {
    await accion();
    await recargar();
    setEdicion(null);
  };

  const encabezado = (
    <PageHeader badge="ADMINISTRACIÓN" title="Rutas de evacuación"
      subtitle="Define la ruta de cada espacio hacia su zona segura y mantén su estado al día." context="Campus y seguridad" />
  );

  if (!datos) {
    return (
      <>
        {encabezado}
        <main className="content">{errorCarga ? <Falla error={errorCarga} /> : <p className="cs-resumen">Cargando rutas…</p>}</main>
      </>
    );
  }

  const espacio = new Map(datos.espacios.map((s) => [s.id, s]));
  const edificio = new Map(datos.edificios.map((e) => [e.id, e]));
  const zona = new Map(datos.zonas.map((z) => [z.id, z]));
  const visibles = datos.rutas.filter((r) =>
    (!filtroEdificio || espacio.get(r.espacioOrigenId)?.edificioId === filtroEdificio) && (!filtroEstado || r.estado === filtroEstado));
  const contar = (estado: EstadoRuta, uno: string, varios: string) => {
    const n = datos.rutas.filter((r) => r.estado === estado).length;
    return `${n} ${n === 1 ? uno : varios}`;
  };

  const origen = (r: Ruta) => {
    const s: Espacio | undefined = espacio.get(r.espacioOrigenId);
    const e: Edificio | undefined = s && edificio.get(s.edificioId);
    return (
      <>
        <span className="cs-codigo">{s ? `${s.codigo} · ${s.nombre}` : 'Espacio desconocido'}</span>
        <small className="cs-sub">{e?.nombre ?? ''}{s && !s.disponible ? ' · no disponible' : ''}</small>
      </>
    );
  };

  return (
    <>
      {encabezado}
      <main className="content">
        {errorCarga && <Falla error={errorCarga} />}

        <div className="cs-barra">
          <div className="cs-barra-titulo">
            <h2 className="title sm22">Rutas registradas</h2>
            <span className="cs-resumen">
              {datos.rutas.length} {datos.rutas.length === 1 ? 'ruta' : 'rutas'} · {contar('DISPONIBLE', 'disponible', 'disponibles')} · {contar('RESTRINGIDA', 'restringida', 'restringidas')} · {contar('BLOQUEADA', 'bloqueada', 'bloqueadas')}
            </span>
          </div>
          {puedeGestionar && (
            <button type="button" className="btn red cs-agregar" onClick={() => setEdicion({ tipo: 'nueva' })}>Nueva ruta</button>
          )}
        </div>

        {edicion?.tipo === 'nueva' && (
          <section className="cs-piso">
            <h3 className="cs-piso-titulo">Nueva ruta</h3>
            <NuevaRuta datos={datos} onCancelar={() => setEdicion(null)} onGuardar={(r) => guardar(() => campus.rutas.crear(r))} />
          </section>
        )}

        <div className="cs-filtros">
          <Campo id="filtro-edificio" etiqueta="Edificio">
            <select id="filtro-edificio" value={filtroEdificio} onChange={(e) => setFiltroEdificio(e.target.value)}>
              <option value="">Todos los edificios</option>
              {datos.edificios.map((e) => <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>)}
            </select>
          </Campo>
          <Campo id="filtro-estado" etiqueta="Estado">
            <select id="filtro-estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as EstadoRuta | '')}>
              <option value="">Todos los estados</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="RESTRINGIDA">Restringida</option>
              <option value="BLOQUEADA">Bloqueada</option>
            </select>
          </Campo>
        </div>

        {visibles.length === 0 ? (
          <p className="cs-alert info">{datos.rutas.length === 0 ? 'Aún no hay rutas registradas.' : 'Ninguna ruta coincide con los filtros.'}</p>
        ) : (
          <div className="cs-tabla">
            <table>
              <thead><tr><th>Espacio de origen</th><th>Zona segura</th><th>Estado</th><th>Motivo</th><th>Actualizada</th><th><span className="cs-oculto">Acciones</span></th></tr></thead>
              <tbody>
                {visibles.map((r) => {
                  if (edicion && edicion.tipo !== 'nueva' && edicion.id === r.id) {
                    return (
                      <tr key={r.id}><td colSpan={6}>
                        <div className="cs-subeditor">
                          <h4>{edicion.tipo === 'modificar' ? 'Modificar ruta' : 'Cambiar estado'} de {espacio.get(r.espacioOrigenId)?.nombre ?? 'la ruta'}</h4>
                          {edicion.tipo === 'modificar' ? (
                            <ModificarRuta ruta={r} zonas={datos.zonas} onCancelar={() => setEdicion(null)}
                              onGuardar={(zonaId, descripcion) => guardar(() => campus.rutas.actualizar(r.id, { zonaSeguraDestinoId: zonaId, descripcion }))} />
                          ) : (
                            <CambiarEstado ruta={r} onCancelar={() => setEdicion(null)}
                              onGuardar={(estado, motivo) => guardar(() => campus.rutas.cambiarEstado(r.id, { estado, motivo }))} />
                          )}
                        </div>
                      </td></tr>
                    );
                  }
                  const z = zona.get(r.zonaSeguraDestinoId);
                  return (
                    <tr key={r.id}>
                      <td>{origen(r)}</td>
                      <td>{z?.nombre ?? 'Zona desconocida'}{z?.estado === 'INACTIVO' && <small className="cs-sub">inactiva</small>}</td>
                      <td><span className={`cs-estado ${ESTADOS[r.estado].tono}`}>{ESTADOS[r.estado].texto}</span></td>
                      <td className="cs-motivo">{r.motivo ?? '—'}</td>
                      <td className="cs-fecha">{fecha(r.actualizadaEn)}</td>
                      <td>
                        <div className="cs-acciones">
                          {puedeGestionar && <button type="button" className="cs-mini" onClick={() => setEdicion({ tipo: 'modificar', id: r.id })}>Modificar</button>}
                          {puedeCambiarEstado && <button type="button" className="cs-mini" onClick={() => setEdicion({ tipo: 'estado', id: r.id })}>Cambiar estado</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
