import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { Campo } from './comun';
import { avisar } from '../../../shared/services/feedback';
import { useCallback, useEffect, useState } from 'react';
import { PERMISSION } from '../../../shared/permissions';
import {
  campus,
  CampusApiError,
  comoCampusError,
  currentPermissions,
} from '../services/campus';
import type {
  DisponibilidadEscalera,
  Edificio,
  Escalera,
  Piso,
} from '../types';

interface Props {
  edificio: Edificio;
  pisos: Piso[];
  mostrarInactivos: boolean;
}

const DISPONIBILIDADES: { valor: DisponibilidadEscalera; etiqueta: string }[] = [
  { valor: 'DISPONIBLE', etiqueta: 'Disponible' },
  { valor: 'BLOQUEADA', etiqueta: 'Bloqueada' },
  { valor: 'FUERA_DE_SERVICIO', etiqueta: 'Fuera de servicio' },
];

const etiquetaDisponibilidad = (valor: DisponibilidadEscalera) =>
  DISPONIBILIDADES.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor;

export default function EscalerasEdificio({
  edificio,
  pisos,
  mostrarInactivos,
}: Props) {
  const [escaleras, setEscaleras] = useState<Escalera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [nombre, setNombre] = useState('');
  const [pisoIds, setPisoIds] = useState<string[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editarId, setEditarId] = useState<string | null>(null);
  const [disponibilidad, setDisponibilidad] =
    useState<DisponibilidadEscalera>('DISPONIBLE');
  const [motivo, setMotivo] = useState('');
  const [prioridadNueva, setPrioridadNueva] = useState('');
  const [prioridadEditarId, setPrioridadEditarId] = useState<string | null>(null);
  const [prioridadEditar, setPrioridadEditar] = useState('');

  const permissions = currentPermissions();
  const puedeGestionar = permissions.includes(PERMISSION.MS02_BUILDING_WRITE);
  const puedeCambiarDisponibilidad = permissions.includes(PERMISSION.MS02_ROUTE_STATUS_WRITE);
  const pisosActivos = pisos.filter((piso) => piso.estado === 'ACTIVO');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await campus.escaleras.listarPorEdificio(
        edificio.id,
        mostrarInactivos,
      );
      setEscaleras([...datos].sort((a, b) => a.prioridad - b.prioridad || a.codigo.localeCompare(b.codigo)));
    } catch (e) {
      setError(comoCampusError(e).message);
    } finally {
      setCargando(false);
    }
  }, [edificio.id, mostrarInactivos]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const alternarPiso = (id: string) => {
    setPisoIds((actuales) =>
      actuales.includes(id)
        ? actuales.filter((pisoId) => pisoId !== id)
        : [...actuales, id],
    );
  };

  const crear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!nombre.trim()) {
      setError('Escriba el nombre de la escalera.');
      return;
    }
    if (pisoIds.length < 2) {
      setError('Seleccione al menos dos pisos activos.');
      return;
    }

    const prioridad = prioridadNueva.trim() ? Number(prioridadNueva) : undefined;
    if (prioridad !== undefined && (!Number.isInteger(prioridad) || prioridad < 1)) {
      setError('La prioridad debe ser un número entero de 1 en adelante.');
      return;
    }

    setGuardando(true);
    try {
      await campus.escaleras.crear(edificio.id, {
        nombre: nombre.trim(),
        pisoIds,
        prioridad,
      });
      setNombre('');
      setPisoIds([]);
      setPrioridadNueva('');
      setMostrarFormulario(false);
      setMensaje('Escalera registrada correctamente.');
      await cargar();
    } catch (e) {
      setError(comoCampusError(e).message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarDisponibilidad = async (
    e: React.FormEvent<HTMLFormElement>,
    escaleraId: string,
  ) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (disponibilidad !== 'DISPONIBLE' && !motivo.trim()) {
      setError('Indique el motivo de la restricción.');
      return;
    }

    setGuardando(true);
    try {
      await campus.escaleras.cambiarDisponibilidad(escaleraId, {
        disponibilidad,
        motivo: disponibilidad === 'DISPONIBLE' ? undefined : motivo.trim(),
      });
      setEditarId(null);
      setMotivo('');
      setMensaje('Disponibilidad actualizada correctamente.');
      await cargar();
    } catch (e) {
      setError(comoCampusError(e).message);
    } finally {
      setGuardando(false);
    }
  };

  const guardarPrioridad = async (e: React.FormEvent<HTMLFormElement>, escaleraId: string) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    const prioridad = Number(prioridadEditar);
    if (!prioridadEditar.trim() || !Number.isInteger(prioridad) || prioridad < 1) {
      setError('La prioridad debe ser un número entero de 1 en adelante.');
      return;
    }
    setGuardando(true);
    try {
      await campus.escaleras.cambiarPrioridad(escaleraId, prioridad);
      setPrioridadEditarId(null);
      setMensaje('Prioridad actualizada correctamente.');
      await cargar();
    } catch (err) {
      setError(comoCampusError(err).message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (escalera: Escalera) => {
    setError('');
    setMensaje('');
    setGuardando(true);
    try {
      const activa = escalera.estado === 'ACTIVO';
      await (activa ? campus.escaleras.inactivar(escalera.id) : campus.escaleras.reactivar(escalera.id));
      await cargar();
      avisar({
        tono: 'exito',
        texto: `Se ${activa ? 'inactivó' : 'reactivó'} la escalera «${escalera.nombre}».`,
        deshacer: async () => {
          await (activa ? campus.escaleras.reactivar(escalera.id) : campus.escaleras.inactivar(escalera.id));
          await cargar();
        },
      });
    } catch (e) {
      const apiError = e instanceof CampusApiError ? e : comoCampusError(e);
      setError(apiError.message);
    } finally {
      setGuardando(false);
    }
  };

  const nombrePiso = (id: string) => {
    const piso = pisos.find((item) => item.id === id);
    return piso ? `${piso.nombre || `Piso ${piso.numero}`}` : 'Piso no disponible';
  };

  const faltanPisos = pisoIds.length < 2;

  return (
    <section className="cs-piso">
      <div className="cs-piso-cabecera">
        <div>
          <h2>Escaleras del edificio</h2>
          <p>
            Conexiones entre los pisos para la evacuación. Si hay más de una, la prioridad 1 es la principal
            y la guía de evacuación nombra las demás como alternas.
          </p>
        </div>
        {puedeGestionar && !mostrarFormulario && (
          <div className="cs-acciones">
            <button type="button" className="btn white sm" onClick={() => setMostrarFormulario(true)}>
              Registrar escalera
            </button>
          </div>
        )}
      </div>

      {error && <Mensaje tono="error">{error}</Mensaje>}
      {mensaje && <Mensaje tono="info">{mensaje}</Mensaje>}

      {mostrarFormulario && puedeGestionar && (
        <form className="cs-editor cs-subeditor" onSubmit={crear}>
          <h4>Nueva escalera</h4>
          <div className="cs-campos">
            <Campo id={`esc-nombre-${edificio.id}`} etiqueta="Nombre">
              <input
                id={`esc-nombre-${edificio.id}`}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={100}
                required
                placeholder="Ej. Escalera principal"
              />
            </Campo>
            <Campo id={`esc-prioridad-${edificio.id}`} etiqueta="Prioridad (opcional)">
              <input
                id={`esc-prioridad-${edificio.id}`}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={prioridadNueva}
                onChange={(e) => setPrioridadNueva(e.target.value)}
                placeholder="1 es la principal"
              />
            </Campo>
          </div>
          <p className="cs-sub">Si deja la prioridad vacía, la escalera queda después de las demás.</p>

          <fieldset className="cs-casillas">
            <legend>Pisos que conecta</legend>
            {pisosActivos.length === 0 ? (
              <Mensaje tono="aviso" compacto>No hay pisos activos disponibles.</Mensaje>
            ) : (
              <div className="cs-casillas-lista">
                {pisosActivos.map((piso) => (
                  <label key={piso.id} className="cs-casilla">
                    <input
                      type="checkbox"
                      checked={pisoIds.includes(piso.id)}
                      onChange={() => alternarPiso(piso.id)}
                    />
                    {nombrePiso(piso.id)}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div className="cs-form-botones">
            <button type="submit" className="btn red sm" disabled={guardando || faltanPisos}
              aria-busy={guardando || undefined} aria-describedby={faltanPisos ? `esc-faltan-${edificio.id}` : undefined}>
              {guardando ? 'Guardando…' : 'Guardar escalera'}
            </button>
            <button type="button" className="btn white sm" onClick={() => setMostrarFormulario(false)} disabled={guardando}>
              Cancelar
            </button>
          </div>
          {faltanPisos && <p className="cs-sub" id={`esc-faltan-${edificio.id}`}>Seleccione al menos dos pisos.</p>}
        </form>
      )}

      {cargando ? (
        <Cargando texto="Cargando escaleras…" />
      ) : escaleras.length === 0 ? (
        <Mensaje tono="info">Este edificio todavía no tiene escaleras registradas.</Mensaje>
      ) : (
        <div className="cs-lista">
          {escaleras.map((escalera) => (
            <article className="cs-subeditor" key={escalera.id}>
              <div className="cs-piso-cabecera">
                <div>
                  <h4>{escalera.nombre}</h4>
                  <p className="cs-sub">
                    {escalera.codigo}
                    {' · '}
                    {escalera.estado === 'ACTIVO' ? 'Activa' : 'Inactiva'}
                    {' · '}
                    {escalera.prioridad === 1 ? 'Principal' : `Prioridad ${escalera.prioridad}`}
                  </p>
                </div>
                <span className={`cs-estado ${escalera.disponibilidad === 'DISPONIBLE' ? 'ok' : escalera.disponibilidad === 'BLOQUEADA' ? 'stop' : 'warn'}`}>
                  {etiquetaDisponibilidad(escalera.disponibilidad)}
                </span>
              </div>

              <p>
                <strong>Pisos conectados:</strong>{' '}
                {escalera.pisoIds.map(nombrePiso).join(' · ')}
              </p>

              {escalera.motivo && (
                <p><strong>Motivo:</strong> {escalera.motivo}</p>
              )}

              <div className="cs-acciones">
                {puedeCambiarDisponibilidad && escalera.estado === 'ACTIVO' && (
                  <button
                    type="button"
                    className="btn white sm"
                    aria-expanded={editarId === escalera.id}
                    onClick={() => {
                      setEditarId(editarId === escalera.id ? null : escalera.id);
                      setDisponibilidad(escalera.disponibilidad);
                      setMotivo(escalera.motivo ?? '');
                      setError('');
                    }}
                  >
                    {editarId === escalera.id ? 'Cancelar cambio' : 'Cambiar disponibilidad'}
                  </button>
                )}

                {puedeGestionar && escalera.estado === 'ACTIVO' && (
                  <button
                    type="button"
                    className="btn white sm"
                    aria-expanded={prioridadEditarId === escalera.id}
                    onClick={() => {
                      setPrioridadEditarId(prioridadEditarId === escalera.id ? null : escalera.id);
                      setPrioridadEditar(String(escalera.prioridad));
                      setError('');
                    }}
                  >
                    {prioridadEditarId === escalera.id ? 'Cancelar prioridad' : 'Cambiar prioridad'}
                  </button>
                )}

                {puedeGestionar && (
                  <button
                    type="button"
                    className={`btn sm ${escalera.estado === 'ACTIVO' ? 'ghost' : 'white'}`}
                    disabled={guardando}
                    onClick={() => void cambiarEstado(escalera)}
                  >
                    {escalera.estado === 'ACTIVO' ? 'Inactivar' : 'Reactivar'}
                  </button>
                )}
              </div>

              {prioridadEditarId === escalera.id && (
                <form className="cs-editor" onSubmit={(e) => void guardarPrioridad(e, escalera.id)}>
                  <div className="cs-campos">
                    <Campo id={`esc-prio-${escalera.id}`} etiqueta="Prioridad (1 es la principal)">
                      <input
                        id={`esc-prio-${escalera.id}`}
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={prioridadEditar}
                        onChange={(e) => setPrioridadEditar(e.target.value)}
                        required
                      />
                    </Campo>
                  </div>
                  <div className="cs-form-botones">
                    <button type="submit" className="btn red sm" disabled={guardando} aria-busy={guardando || undefined}>
                      {guardando ? 'Guardando…' : 'Guardar prioridad'}
                    </button>
                  </div>
                </form>
              )}

              {editarId === escalera.id && (
                <form className="cs-editor" onSubmit={(e) => void cambiarDisponibilidad(e, escalera.id)}>
                  <div className="cs-campos">
                    <Campo id={`esc-disp-${escalera.id}`} etiqueta="Disponibilidad">
                      <select
                        id={`esc-disp-${escalera.id}`}
                        value={disponibilidad}
                        onChange={(e) => setDisponibilidad(e.target.value as DisponibilidadEscalera)}
                      >
                        {DISPONIBILIDADES.map((opcion) => (
                          <option key={opcion.valor} value={opcion.valor}>
                            {opcion.etiqueta}
                          </option>
                        ))}
                      </select>
                    </Campo>

                    {disponibilidad !== 'DISPONIBLE' && (
                      <Campo id={`esc-motivo-${escalera.id}`} etiqueta="Motivo (obligatorio)">
                        <input
                          id={`esc-motivo-${escalera.id}`}
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          maxLength={255}
                          required
                          placeholder="Describa por qué no está disponible"
                        />
                      </Campo>
                    )}
                  </div>
                  <div className="cs-form-botones">
                    <button type="submit" className="btn red sm" disabled={guardando} aria-busy={guardando || undefined}>
                      {guardando ? 'Guardando…' : 'Guardar disponibilidad'}
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
