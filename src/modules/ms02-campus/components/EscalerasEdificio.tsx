import { useCallback, useEffect, useState } from 'react';
import {
  campus,
  CampusApiError,
  comoCampusError,
  rolesDeSesion,
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

  const roles = rolesDeSesion() ?? [];
  const esAdmin = roles.includes('ADMIN');
  const puedeCambiarDisponibilidad =
    esAdmin || roles.includes('COORDINADOR');
  const pisosActivos = pisos.filter((piso) => piso.estado === 'ACTIVO');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await campus.escaleras.listarPorEdificio(
        edificio.id,
        mostrarInactivos,
      );
      setEscaleras(datos);
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
      setError('Escribe el nombre de la escalera.');
      return;
    }
    if (pisoIds.length < 2) {
      setError('Selecciona al menos dos pisos activos.');
      return;
    }

    setGuardando(true);
    try {
      await campus.escaleras.crear(edificio.id, {
        nombre: nombre.trim(),
        pisoIds,
      });
      setNombre('');
      setPisoIds([]);
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
      setError('Indica el motivo de la restricción.');
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

  const cambiarEstado = async (escalera: Escalera) => {
    setError('');
    setMensaje('');
    setGuardando(true);
    try {
      if (escalera.estado === 'ACTIVO') {
        await campus.escaleras.inactivar(escalera.id);
        setMensaje('Escalera inactivada.');
      } else {
        await campus.escaleras.reactivar(escalera.id);
        setMensaje('Escalera reactivada.');
      }
      await cargar();
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

  return (
    <section className="cs-piso">
      <div className="cs-piso-cabecera">
        <div>
          <h2>Escaleras del edificio</h2>
          <p>Conexiones entre los pisos para la evacuación.</p>
        </div>
        {esAdmin && (
          <div className="cs-acciones">
            <button
              type="button"
              className="cs-boton"
              onClick={() => setMostrarFormulario((actual) => !actual)}
            >
              {mostrarFormulario ? 'Cancelar' : 'Registrar escalera'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="cs-alert error" role="alert">{error}</p>}
      {mensaje && <p className="cs-alert info" role="status">{mensaje}</p>}

      {mostrarFormulario && esAdmin && (
        <form className="cs-editor" onSubmit={crear}>
          <h3>Nueva escalera</h3>
          <label className="cs-campo">
            Nombre
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={100}
              required
              placeholder="Ej. Escalera principal"
            />
          </label>

          <fieldset>
            <legend>Pisos que conecta (selecciona mínimo dos)</legend>
            {pisosActivos.length === 0 ? (
              <p>No hay pisos activos disponibles.</p>
            ) : (
              <div className="cs-acciones">
                {pisosActivos.map((piso) => (
                  <label key={piso.id}>
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

          <div className="cs-acciones">
            <button type="submit" disabled={guardando || pisoIds.length < 2}>
              {guardando ? 'Guardando…' : 'Guardar escalera'}
            </button>
            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              disabled={guardando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <p>Cargando escaleras…</p>
      ) : escaleras.length === 0 ? (
        <p className="cs-alert info">Este edificio todavía no tiene escaleras registradas.</p>
      ) : (
        <div className="cs-lista">
          {escaleras.map((escalera) => (
            <article className="cs-subeditor" key={escalera.id}>
              <div className="cs-piso-cabecera">
                <div>
                  <h3>{escalera.nombre}</h3>
                  <p>
                    <strong>{escalera.codigo}</strong>
                    {' · '}
                    {escalera.estado === 'ACTIVO' ? 'Activa' : 'Inactiva'}
                  </p>
                </div>
                <span className="cs-mini">
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

                {esAdmin && (
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={() => void cambiarEstado(escalera)}
                  >
                    {escalera.estado === 'ACTIVO' ? 'Inactivar' : 'Reactivar'}
                  </button>
                )}
              </div>

              {editarId === escalera.id && (
                <form
                  className="cs-editor"
                  onSubmit={(e) => void cambiarDisponibilidad(e, escalera.id)}
                >
                  <label className="cs-campo">
                    Disponibilidad
                    <select
                      value={disponibilidad}
                      onChange={(e) =>
                        setDisponibilidad(e.target.value as DisponibilidadEscalera)
                      }
                    >
                      {DISPONIBILIDADES.map((opcion) => (
                        <option key={opcion.valor} value={opcion.valor}>
                          {opcion.etiqueta}
                        </option>
                      ))}
                    </select>
                  </label>

                  {disponibilidad !== 'DISPONIBLE' && (
                    <label className="cs-campo">
                      Motivo (obligatorio)
                      <input
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        maxLength={255}
                        required
                        placeholder="Describe por qué no está disponible"
                      />
                    </label>
                  )}

                  <button type="submit" disabled={guardando}>
                    {guardando ? 'Guardando…' : 'Guardar disponibilidad'}
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
