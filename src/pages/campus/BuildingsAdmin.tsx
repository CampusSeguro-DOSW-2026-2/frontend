import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../components/Layout';
import { campus, CampusApiError, comoCampusError as comoError, rolesDeSesion } from '../../services/campus';
import type { Edificio, EdificioRequest } from '../../types/campus';
import { Botones, Campo, Falla } from './comun';
import { useEnvio, type Errores } from './useEnvio';
import './campus.css';
import './admin.css';

type Filtro = 'TODOS' | 'ACTIVO' | 'INACTIVO';
type Edicion = { tipo: 'nuevo' } | { tipo: 'edificio'; id: string } | null;

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'TODOS', texto: 'Todos' },
  { valor: 'ACTIVO', texto: 'Activos' },
  { valor: 'INACTIVO', texto: 'Inactivos' },
];

// El código es fijo (RF-01): solo se escribe al crear y queda bloqueado al modificar.
function EdificioForm({ inicial, onGuardar, onCancelar }: {
  inicial?: Edificio; onGuardar: (datos: EdificioRequest) => Promise<void>; onCancelar: () => void;
}) {
  const [codigo, setCodigo] = useState(inicial?.codigo ?? '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);
  const id = inicial?.id ?? 'nuevo';

  const validar = () => {
    const e: Errores = {};
    if (!inicial && !codigo.trim()) e.codigo = 'El código es obligatorio.';
    else if (codigo.trim().length > 50) e.codigo = 'El código no puede superar 50 caracteres.';
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    else if (nombre.trim().length > 100) e.nombre = 'El nombre no puede superar 100 caracteres.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), { codigo: codigo.trim(), nombre: nombre.trim(), descripcion: descripcion.trim() || undefined });
    }}>
      <div className="cs-campos">
        <Campo id={`edificio-codigo-${id}`} etiqueta={inicial ? 'Código (no se puede cambiar)' : 'Código'} error={errores.codigo}>
          <input id={`edificio-codigo-${id}`} value={codigo} placeholder="ED-G" disabled={!!inicial} onChange={(e) => setCodigo(e.target.value)} />
        </Campo>
        <Campo id={`edificio-nombre-${id}`} etiqueta="Nombre" error={errores.nombre}>
          <input id={`edificio-nombre-${id}`} value={nombre} placeholder="Bloque G" onChange={(e) => setNombre(e.target.value)} />
        </Campo>
      </div>
      <Campo id={`edificio-descripcion-${id}`} etiqueta="Descripción (opcional)" error={errores.descripcion}>
        <textarea id={`edificio-descripcion-${id}`} value={descripcion} placeholder="Laboratorios y aulas de ingeniería" onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

export default function BuildingsAdmin() {
  const [edificios, setEdificios] = useState<Edificio[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<CampusApiError | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('ACTIVO');
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aviso, setAviso] = useState<CampusApiError | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const roles = rolesDeSesion();
  const puedeGestionar = roles === null || roles.includes('ADMIN');

  const aplicar = useCallback((lista: Edificio[]) => { setEdificios(lista); setErrorCarga(null); }, []);

  useEffect(() => {
    let vigente = true;
    campus.edificios.listar(true)
      .then((lista) => { if (vigente) aplicar(lista); })
      .catch((e) => { if (vigente) setErrorCarga(comoError(e)); });
    return () => { vigente = false; };
  }, [aplicar]);

  const recargar = async () => {
    try {
      aplicar(await campus.edificios.listar(true));
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

  // El backend responde 422 con las rutas que impiden inactivar: se muestra tal cual.
  const cambiarEstado = async (edificio: Edificio) => {
    setOcupado(edificio.id);
    setAviso(null);
    try {
      await (edificio.estado === 'ACTIVO' ? campus.edificios.inactivar(edificio.id) : campus.edificios.reactivar(edificio.id));
      await recargar();
    } catch (e) {
      setAviso(comoError(e));
    } finally {
      setOcupado(null);
    }
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
  const visibles = edificios.filter((e) => filtro === 'TODOS' || e.estado === filtro);

  return (
    <>
      {cabecera}
      <main className="content">
        {errorCarga && <Falla error={errorCarga} />}
        {aviso && <Falla error={aviso} />}

        <div className="cs-barra">
          <div className="cs-barra-titulo">
            <h2 className="title sm22">Edificios del campus</h2>
            <span className="cs-resumen">
              {activos} {activos === 1 ? 'activo' : 'activos'} · {inactivos} {inactivos === 1 ? 'inactivo' : 'inactivos'}
            </span>
          </div>
          <div className="cs-filtro-estado" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button key={f.valor} type="button" className="cs-pildora" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}>
                {f.texto} ({conteo[f.valor]})
              </button>
            ))}
          </div>
          {puedeGestionar && (
            <button type="button" className="btn red cs-agregar" onClick={() => editar({ tipo: 'nuevo' })}>Crear edificio</button>
          )}
        </div>

        {edicion?.tipo === 'nuevo' && (
          <section className="cs-piso">
            <h3 className="cs-piso-titulo">Nuevo edificio</h3>
            <EdificioForm onCancelar={() => editar(null)}
              onGuardar={(datos) => guardar(() => campus.edificios.crear(datos))} />
          </section>
        )}

        {visibles.length === 0 && edicion?.tipo !== 'nuevo' ? (
          <p className="cs-alert info">
            {edificios.length === 0
              ? 'Todavía no hay edificios registrados.'
              : 'No hay edificios con este filtro. Prueba con «Todos».'}
          </p>
        ) : visibles.length > 0 && (
          <div className="cs-tabla">
            <table>
              <thead>
                <tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Estado</th><th><span className="cs-oculto">Acciones</span></th></tr>
              </thead>
              <tbody>
                {visibles.map((edificio) => {
                  const activo = edificio.estado === 'ACTIVO';
                  if (edicion?.tipo === 'edificio' && edicion.id === edificio.id) {
                    return (
                      <tr key={edificio.id}><td colSpan={5}>
                        <EdificioForm inicial={edificio} onCancelar={() => editar(null)}
                          onGuardar={(datos) => guardar(() => campus.edificios.modificar(edificio.id, { nombre: datos.nombre, descripcion: datos.descripcion }))} />
                      </td></tr>
                    );
                  }
                  return (
                    <tr key={edificio.id} className={activo ? '' : 'inactivo'}>
                      <td className="cs-codigo">{edificio.codigo}</td>
                      <td>{edificio.nombre}</td>
                      <td className="cs-descripcion">{edificio.descripcion || '—'}</td>
                      <td><span className={`cs-estado ${activo ? 'ok' : 'info'}`}>{edificio.estado}</span></td>
                      <td>
                        <div className="cs-acciones">
                          <a className="cs-mini" href={`#/admin/edificios/${edificio.id}`}>Pisos y espacios</a>
                          {puedeGestionar && activo && (
                            <button type="button" className="cs-mini" onClick={() => editar({ tipo: 'edificio', id: edificio.id })}>Modificar</button>
                          )}
                          {puedeGestionar && (
                            <button type="button" className={`cs-mini${activo ? ' peligro' : ''}`} disabled={ocupado === edificio.id}
                              onClick={() => cambiarEstado(edificio)}>
                              {ocupado === edificio.id ? 'Guardando…' : activo ? 'Inactivar' : 'Reactivar'}
                            </button>
                          )}
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
