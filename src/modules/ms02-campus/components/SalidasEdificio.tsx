import { useCallback, useEffect, useState } from 'react';
import { campus, CampusApiError, comoCampusError as comoError } from '../services/campus';
import type { Edificio, Piso, Salida, SalidaRequest } from '../types';
import { useEnvio, type Errores } from '../hooks/useEnvio';
import { Botones, Campo, Falla } from './comun';
import { BotonQr } from './BotonQr';

type Edicion = { tipo: 'nueva' } | { tipo: 'modificar'; id: string } | null;

const enMapa = (s: { latitud: number; longitud: number }) =>
  `https://www.openstreetmap.org/?mlat=${s.latitud}&mlon=${s.longitud}#map=19/${s.latitud}/${s.longitud}`;

function numero(texto: string): number | null {
  const valor = Number(texto.trim().replace(',', '.'));
  return texto.trim() === '' || Number.isNaN(valor) ? null : valor;
}

function SalidaForm({ inicial, pisos, onGuardar, onCancelar }: {
  inicial?: Salida; pisos: Piso[]; onGuardar: (datos: SalidaRequest) => Promise<void>; onCancelar: () => void;
}) {
  const [pisoId, setPisoId] = useState(inicial?.pisoId ?? '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [latitud, setLatitud] = useState(inicial ? String(inicial.latitud) : '');
  const [longitud, setLongitud] = useState(inicial ? String(inicial.longitud) : '');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);
  const id = inicial?.id ?? 'nueva';
  const lat = numero(latitud);
  const lng = numero(longitud);

  const validar = () => {
    const e: Errores = {};
    if (!pisoId) e.pisoId = 'Selecciona el piso desde el que se sale.';
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    else if (nombre.trim().length > 100) e.nombre = 'El nombre no puede superar 100 caracteres.';
    if (lat === null || lat < -90 || lat > 90) e.latitud = 'Escribe una latitud entre -90 y 90, por ejemplo 4.78271.';
    if (lng === null || lng < -180 || lng > 180) e.longitud = 'Escribe una longitud entre -180 y 180, por ejemplo -74.04263.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), { pisoId, nombre: nombre.trim(), latitud: lat ?? 0, longitud: lng ?? 0 });
    }}>
      <div className="cs-campos">
        <Campo id={`salida-piso-${id}`} etiqueta="Piso desde el que se sale" error={errores.pisoId}>
          <select id={`salida-piso-${id}`} value={pisoId} onChange={(e) => setPisoId(e.target.value)}>
            <option value="">Selecciona un piso</option>
            {pisos.map((p) => <option key={p.id} value={p.id}>Piso {p.numero}{p.nombre ? ` · ${p.nombre}` : ''}</option>)}
          </select>
        </Campo>
        <Campo id={`salida-nombre-${id}`} etiqueta="Nombre" error={errores.nombre}>
          <input id={`salida-nombre-${id}`} value={nombre} placeholder="Salida principal" onChange={(e) => setNombre(e.target.value)} />
        </Campo>
      </div>
      <div className="cs-campos">
        <Campo id={`salida-latitud-${id}`} etiqueta="Latitud" error={errores.latitud}>
          <input id={`salida-latitud-${id}`} inputMode="decimal" value={latitud} placeholder="4.78271" onChange={(e) => setLatitud(e.target.value)} />
        </Campo>
        <Campo id={`salida-longitud-${id}`} etiqueta="Longitud" error={errores.longitud}>
          <input id={`salida-longitud-${id}`} inputMode="decimal" value={longitud} placeholder="-74.04263" onChange={(e) => setLongitud(e.target.value)} />
        </Campo>
      </div>
      {lat !== null && lng !== null && (
        <a className="cs-enlace" href={enMapa({ latitud: lat, longitud: lng })} target="_blank" rel="noreferrer">Revisar estas coordenadas en OpenStreetMap</a>
      )}
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

function estado(s: Salida) {
  if (s.estado === 'INACTIVO') return <span className="cs-estado info">INACTIVA</span>;
  if (!s.disponible) return <span className="cs-estado warn">NO DISPONIBLE</span>;
  return <span className="cs-estado ok">ACTIVA</span>;
}

export default function SalidasEdificio({ edificio, pisos, mostrarInactivos }: {
  edificio: Edificio; pisos: Piso[]; mostrarInactivos: boolean;
}) {
  const [salidas, setSalidas] = useState<Salida[] | null>(null);
  const [error, setError] = useState<CampusApiError | null>(null);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const estadoPisos = pisos.map((p) => p.id + p.estado).join();

  const aplicar = useCallback((lista: Salida[]) => { setSalidas(lista); setError(null); }, []);

  useEffect(() => {
    let vigente = true;
    campus.salidas.listarPorEdificio(edificio.id, true)
      .then((lista) => { if (vigente) aplicar(lista); })
      .catch((e) => { if (vigente) setError(comoError(e)); });
    return () => { vigente = false; };
  }, [edificio.id, edificio.estado, estadoPisos, aplicar]);

  const recargar = async () => aplicar(await campus.salidas.listarPorEdificio(edificio.id, true));

  const guardar = async (accion: () => Promise<unknown>) => {
    await accion();
    await recargar();
    setEdicion(null);
  };

  const cambiarEstado = async (s: Salida) => {
    setOcupado(s.id);
    setError(null);
    try {
      await (s.estado === 'ACTIVO' ? campus.salidas.inactivar(s.id) : campus.salidas.reactivar(s.id));
      await recargar();
    } catch (e) {
      setError(comoError(e));
    } finally {
      setOcupado(null);
    }
  };

  const pisosActivos = pisos.filter((p) => p.estado === 'ACTIVO');
  const numeroPiso = new Map(pisos.map((p) => [p.id, p.numero]));
  const visibles = (salidas ?? []).filter((s) => mostrarInactivos || s.estado === 'ACTIVO');
  const disponibles = (salidas ?? []).filter((s) => s.disponible).length;

  return (
    <section className="cs-piso" aria-labelledby="salidas-titulo">
      <div className="cs-piso-cabecera">
        <h3 className="cs-piso-titulo" id="salidas-titulo">
          Salidas al exterior<span> · {disponibles} {disponibles === 1 ? 'disponible' : 'disponibles'}</span>
        </h3>
        {edificio.estado === 'ACTIVO' && pisosActivos.length > 0 && edicion?.tipo !== 'nueva' && (
          <div className="cs-acciones">
            <button type="button" className="cs-mini" onClick={() => setEdicion({ tipo: 'nueva' })}>Agregar salida</button>
          </div>
        )}
      </div>
      <p className="cs-vacio">Son el inicio de la ruta exterior hacia la zona segura; por eso llevan coordenadas.</p>

      {error && <Falla error={error} />}

      {edicion?.tipo === 'nueva' && (
        <div className="cs-subeditor">
          <h4>Nueva salida</h4>
          <SalidaForm pisos={pisosActivos} onCancelar={() => setEdicion(null)}
            onGuardar={(datos) => guardar(() => campus.salidas.crear(edificio.id, datos))} />
        </div>
      )}

      {salidas === null ? (
        !error && <p className="cs-vacio">Cargando salidas…</p>
      ) : visibles.length === 0 ? (
        <p className="cs-alert info">
          {salidas.length === 0
            ? 'Este edificio todavía no tiene salidas. Sin una salida no se puede calcular la ruta exterior.'
            : 'Todas las salidas están inactivas. Marca «Mostrar inactivos» para verlas.'}
        </p>
      ) : (
        <div className="cs-tabla">
          <table>
            <thead><tr><th>Nombre</th><th>Piso</th><th>Coordenadas</th><th>Estado</th><th><span className="cs-oculto">Acciones</span></th></tr></thead>
            <tbody>
              {visibles.map((s) => {
                if (edicion?.tipo === 'modificar' && edicion.id === s.id) {
                  return (
                    <tr key={s.id}><td colSpan={5}>
                      <SalidaForm inicial={s} pisos={pisos.filter((p) => p.estado === 'ACTIVO' || p.id === s.pisoId)}
                        onCancelar={() => setEdicion(null)}
                        onGuardar={(datos) => guardar(() => campus.salidas.modificar(s.id,
                          { pisoId: datos.pisoId, nombre: datos.nombre, latitud: datos.latitud, longitud: datos.longitud }))} />
                    </td></tr>
                  );
                }
                const activa = s.estado === 'ACTIVO';
                return (
                  <tr key={s.id} className={activa ? '' : 'inactivo'}>
                    <td className="cs-codigo">{s.nombre}</td>
                    <td>Piso {s.pisoNumero ?? numeroPiso.get(s.pisoId) ?? '—'}</td>
                    <td><a className="cs-enlace" href={enMapa(s)} target="_blank" rel="noreferrer">{s.latitud}, {s.longitud}</a></td>
                    <td>{estado(s)}</td>
                    <td>
                      <div className="cs-acciones">
                        {activa && <BotonQr elemento="salida" id={s.id} nombre={s.nombre} />}
                        {activa && <button type="button" className="cs-mini" onClick={() => setEdicion({ tipo: 'modificar', id: s.id })}>Modificar</button>}
                        <button type="button" className={`cs-mini${activa ? ' peligro' : ''}`} disabled={ocupado === s.id}
                          onClick={() => cambiarEstado(s)}>
                          {ocupado === s.id ? 'Guardando…' : activa ? 'Inactivar' : 'Reactivar'}
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
}
