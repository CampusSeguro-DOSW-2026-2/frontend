import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { campus, CampusApiError, comoCampusError as comoError, currentPermissions } from '../services/campus';
import type { Edificio, Espacio, EstadoRuta, Ruta } from '../types';
import { Botones, Campo, Falla } from '../components/comun';
import { RutaExteriorAdmin } from '../components/RutaExteriorAdmin';
import { useEnvio, type Errores } from '../hooks/useEnvio';
import '../styles/campus.css';

const ESTADOS: Record<EstadoRuta, { texto: string; tono: string }> = {
  DISPONIBLE: { texto: 'DISPONIBLE', tono: 'ok' },
  RESTRINGIDA: { texto: 'RESTRINGIDA', tono: 'warn' },
  BLOQUEADA: { texto: 'BLOQUEADA', tono: 'stop' },
};

type Edicion = { tipo: 'estado'; id: string } | null;

const leer = async () => {
  const [todas, edificios, zonas] = await Promise.all([
    campus.rutas.listar(),
    campus.edificios.listar(true),
    campus.zonas.listar(true),
  ]);
  const espacios = (await Promise.all(edificios.map((e) => campus.espacios.listarPorEdificio(e.id, true)))).flat();
  // Las rutas exteriores (salida -> zona, generadas por MS02) no tienen espacio de origen: se ven en "Ruta exterior".
  const rutas = todas.filter((r): r is Ruta => Boolean(r.espacioOrigenId));
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

  const permissions = currentPermissions();
  const puedeGestionar = permissions.includes(PERMISSION.MS02_ROUTE_WRITE);
  const puedeCambiarEstado = permissions.includes(PERMISSION.MS02_ROUTE_STATUS_WRITE);

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
      subtitle="Las rutas desde cada salida hasta las zonas seguras se generan solas, y la guía de cada espacio se arma con sus escaleras y salidas. Las rutas por espacio de esta tabla son opcionales: solo hacen falta para dar una indicación escrita propia." context="Campus y seguridad" />
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
        <span className="cs-codigo">{s ? s.nombre : 'Espacio desconocido'}</span>
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
        </div>

        <div className="cs-filtros">
          <Campo id="filtro-edificio" etiqueta="Edificio">
            <select id="filtro-edificio" value={filtroEdificio} onChange={(e) => setFiltroEdificio(e.target.value)}>
              <option value="">Todos los edificios</option>
              {datos.edificios.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
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
                  if (edicion && edicion.id === r.id) {
                    return (
                      <tr key={r.id}><td colSpan={6}>
                        <div className="cs-subeditor">
                          <h4>Cambiar estado de {espacio.get(r.espacioOrigenId)?.nombre ?? 'la ruta'}</h4>
                          <CambiarEstado ruta={r} onCancelar={() => setEdicion(null)}
                            onGuardar={(estado, motivo) => guardar(() => campus.rutas.cambiarEstado(r.id, { estado, motivo }))} />
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

        <RutaExteriorAdmin edificios={datos.edificios} zonas={datos.zonas} puedeCalcular={puedeGestionar} />
      </main>
    </>
  );
}
