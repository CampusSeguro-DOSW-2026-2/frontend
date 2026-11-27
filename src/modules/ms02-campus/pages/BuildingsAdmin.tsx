import { Cargando } from '../../../shared/components/Cargando';
import { avisar, confirmar } from '../../../shared/services/feedback';
import { Mensaje } from '../../../shared/components/Mensaje';
import { etiquetaCodigo } from '../../../shared/utils/etiquetas';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { campus, CampusApiError, comoCampusError as comoError, currentPermissions } from '../services/campus';
import type { Campus, Edificio, EdificioRequest } from '../types';
import { Botones, Campo, Falla } from '../components/comun';
import { TarjetaEdificio } from '../components/TarjetaEdificio';
import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { Search } from '../../../shared/components/Icons';
import { normalizar } from '../utils/formato';
import { useEnvio, type Errores } from '../hooks/useEnvio';
import '../styles/campus.css';
import '../styles/admin.css';

type Filtro = 'TODOS' | 'ACTIVO' | 'INACTIVO';
type Edicion = { tipo: 'nuevo' } | { tipo: 'edificio'; id: string } | null;

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'TODOS', texto: 'Todos' },
  { valor: 'ACTIVO', texto: 'Activos' },
  { valor: 'INACTIVO', texto: 'Inactivos' },
];

function EdificioForm({ inicial, campuses, onGuardar, onCancelar }: {
  inicial?: Edificio; campuses: Campus[]; onGuardar: (datos: EdificioRequest) => Promise<void>; onCancelar: () => void;
}) {
  const opciones = campuses.filter((c) => c.estado === 'ACTIVO' || c.id === inicial?.campusId);
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [campusId, setCampusId] = useState(inicial?.campusId ?? opciones[0]?.id ?? '');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);
  const id = inicial?.id ?? 'nuevo';

  const validar = () => {
    const e: Errores = {};
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    else if (nombre.trim().length > 100) e.nombre = 'El nombre no puede superar 100 caracteres.';
    if (!campusId) e.campusId = 'Elija el campus al que pertenece el edificio.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined, campusId });
    }}>
      <div className="cs-campos">
        <Campo id={`edificio-nombre-${id}`} etiqueta="Nombre" error={errores.nombre}>
          <input id={`edificio-nombre-${id}`} value={nombre} placeholder="Bloque G" onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo id={`edificio-campus-${id}`} etiqueta="Campus" error={errores.campusId}>
          <select id={`edificio-campus-${id}`} value={campusId} onChange={(e) => setCampusId(e.target.value)}>
            {opciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
      </div>
      <Campo id={`edificio-descripcion-${id}`} etiqueta="Descripción (opcional)" error={errores.descripcion}>
        <textarea id={`edificio-descripcion-${id}`} value={descripcion} placeholder="Laboratorios y aulas de ingeniería" onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} accion="Guardar edificio" />
    </form>
  );
}

export default function BuildingsAdmin() {
  const [edificios, setEdificios] = useState<Edificio[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<CampusApiError | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('ACTIVO');
  const [busqueda, setBusqueda] = useState('');
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aviso, setAviso] = useState<CampusApiError | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
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

  // Todo edificio pertenece a un campus: sin la lista no se puede crear ni modificar.
  useEffect(() => {
    let vigente = true;
    campus.campuses.listar(true)
      .then((lista) => { if (vigente) setCampuses(lista); })
      .catch((e) => { if (vigente) setErrorCampus(comoError(e)); });
    return () => { vigente = false; };
  }, []);

  const recargar = async () => {
    try {
      aplicar(await campus.edificios.listar(true));
    } catch (e) {
      setErrorCarga(comoError(e));
    }
  };

  const editar = (e: Edicion) => { setEdicion(e); setAviso(null); };

  // Crear o modificar: al guardar se cierra el formulario y un aviso confirma el cambio (docs/PATRONES-UI.md)
  const guardar = async (exito: string, accion: () => Promise<unknown>) => {
    await accion();
    await recargar();
    setEdicion(null);
    avisar({ tono: 'exito', texto: exito });
  };

  // Igual que pisos, salidas y escaleras: antes de inactivar se dice cuántos espacios pierden la ruta. Si no se pueden
  // contar, el diálogo sale sin el número.
  const confirmarInactivarEdificio = async (edificio: Edificio) => {
    const n = await campus.espacios.listarPorEdificio(edificio.id)
      .then((lista) => lista.filter((s) => s.estado === 'ACTIVO').length)
      .catch(() => null);
    const texto = n === null
      ? 'Sus espacios dejarán de tener ruta de evacuación.'
      : n === 0
        ? 'No tiene espacios activos, así que ninguna ruta de evacuación se ve afectada.'
        : n === 1
          ? 'Su espacio dejará de tener ruta de evacuación.'
          : `Sus ${n} espacios dejarán de tener ruta de evacuación.`;
    return confirmar({ titulo: `¿Inactivar el edificio ${edificio.nombre}?`, texto, accion: 'Inactivar edificio', peligro: true });
  };

  // El backend responde 422 con las rutas que impiden inactivar: se muestra tal cual.
  const cambiarEstado = async (edificio: Edificio) => {
    const activo = edificio.estado === 'ACTIVO';
    if (activo && !(await confirmarInactivarEdificio(edificio))) return;
    setOcupado(edificio.id);
    setAviso(null);
    try {
      await (activo ? campus.edificios.inactivar(edificio.id) : campus.edificios.reactivar(edificio.id));
      await recargar();
      avisar({
        tono: 'exito',
        texto: `Se ${activo ? 'inactivó' : 'reactivó'} el edificio «${edificio.nombre}».`,
        deshacer: async () => {
          await (activo ? campus.edificios.reactivar(edificio.id) : campus.edificios.inactivar(edificio.id));
          await recargar();
        },
      });
    } catch (e) {
      setAviso(comoError(e));
    } finally {
      setOcupado(null);
    }
  };

  const cabecera = <PageHeader badge="ADMINISTRACIÓN" title="Edificios" subtitle="Gestione los edificios del campus y entre a sus pisos y espacios." />;

  if (!edificios) {
    return (
      <>
        {cabecera}
        <main className="content">
          {errorCarga ? <Falla error={errorCarga} /> : <Cargando texto="Cargando edificios…" />}
        </main>
      </>
    );
  }

  const activos = edificios.filter((e) => e.estado === 'ACTIVO').length;
  const inactivos = edificios.length - activos;
  const conteo: Record<Filtro, number> = { TODOS: edificios.length, ACTIVO: activos, INACTIVO: inactivos };
  const texto = normalizar(busqueda);
  const visibles = edificios
    .filter((e) => filtro === 'TODOS' || e.estado === filtro)
    .filter((e) => !texto || normalizar(e.nombre).includes(texto));
  const hayCampusActivo = !!campuses?.some((c) => c.estado === 'ACTIVO');

  return (
    <>
      {cabecera}
      <main className="content">
        {errorCarga && <Falla error={errorCarga} />}
        {aviso && <Falla error={aviso} />}
        {errorCampus && (
          <Mensaje tono="error">
            No se pudieron cargar los campus, así que no puede crear ni modificar edificios. {errorCampus.message}
          </Mensaje>
        )}
        {puedeGestionar && campuses && !hayCampusActivo && (
          <Mensaje tono="info">
            Para crear edificios, primero registre un campus activo en <a href="#/admin/campus">Campus y zonas abiertas</a>.
          </Mensaje>
        )}

        <div className="cs-barra">
          <div className="cs-barra-titulo">
            <h2 className="title sm22">Edificios del campus</h2>
            <span className="cs-resumen">
              {activos} {activos === 1 ? 'activo' : 'activos'} · {inactivos} {inactivos === 1 ? 'inactivo' : 'inactivos'}
            </span>
          </div>
          <a className="cs-mini" href="#/admin/campus">Campus y zonas abiertas</a>
          {puedeGestionar && (
            <button type="button" className="btn red cs-agregar" disabled={!hayCampusActivo} onClick={() => editar({ tipo: 'nuevo' })}>Crear edificio</button>
          )}
        </div>

        <div className="ev-tools cs-edif-herramientas">
          <div className="cs-filtro-estado" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button key={f.valor} type="button" className="cs-pildora" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}>
                {f.texto} ({conteo[f.valor]})
              </button>
            ))}
          </div>
          <div className="searchbar">
            <Search /><input type="search" aria-label="Buscar edificios por nombre" placeholder="Buscar por nombre"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>

        {edicion?.tipo === 'nuevo' && campuses && (
          <section className="cs-piso">
            <h3 className="cs-piso-titulo">Nuevo edificio</h3>
            <EdificioForm campuses={campuses} onCancelar={() => editar(null)}
              onGuardar={(datos) => guardar('Edificio creado.', () => campus.edificios.crear(datos))} />
          </section>
        )}

        {visibles.length === 0 && edicion?.tipo !== 'nuevo' ? (
          busqueda.trim() && edificios.length > 0 ? (
            <EstadoVacio titulo={`Ningún edificio coincide con «${busqueda.trim()}»`}>Pruebe con otro nombre o con el filtro «Todos».</EstadoVacio>
          ) : (
            <Mensaje tono="info">
              {edificios.length === 0
                ? 'Todavía no hay edificios registrados.'
                : 'No hay edificios con este filtro. Pruebe con «Todos».'}
            </Mensaje>
          )
        ) : visibles.length > 0 && (
          <div className="cs-edificios">
            {visibles.map((edificio) => {
              const activo = edificio.estado === 'ACTIVO';
              if (edicion?.tipo === 'edificio' && edicion.id === edificio.id) {
                return (
                  <section key={edificio.id} className="cs-piso cs-edif-form">
                    <h3 className="cs-piso-titulo">Editar «{edificio.nombre}»</h3>
                    <EdificioForm inicial={edificio} campuses={campuses ?? []} onCancelar={() => editar(null)}
                      onGuardar={(datos) => guardar('Cambios del edificio guardados.', () => campus.edificios.modificar(edificio.id, { nombre: datos.nombre, descripcion: datos.descripcion, campusId: datos.campusId }))} />
                  </section>
                );
              }
              return (
                <TarjetaEdificio key={edificio.id} edificio={edificio} href={`#/admin/edificios/${edificio.id}`}
                  descripcionVacia="Sin descripción" revisarEscaleras={activo}
                  chips={<span className={`cs-estado ${activo ? 'ok' : 'info'}`}>{etiquetaCodigo(edificio.estado)}</span>}
                  acciones={puedeGestionar && (
                    <>
                      {activo && campuses && (
                        <button type="button" className="cs-mini" onClick={() => editar({ tipo: 'edificio', id: edificio.id })}
                          aria-label={`Editar ${edificio.nombre}`}>Editar</button>
                      )}
                      <button type="button" className={`cs-mini${activo ? ' peligro' : ''}`} disabled={ocupado === edificio.id}
                        aria-label={`${activo ? 'Inactivar' : 'Reactivar'} ${edificio.nombre}`} onClick={() => cambiarEstado(edificio)}>
                        {ocupado === edificio.id ? (activo ? 'Inactivando…' : 'Reactivando…') : activo ? 'Inactivar' : 'Reactivar'}
                      </button>
                    </>
                  )} />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
