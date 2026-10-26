import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../components/Layout';
import { campus, CampusApiError, comoCampusError as comoError, rolesDeSesion } from '../../services/campus';
import type { ZonaSegura, ZonaSeguraRequest } from '../../types/campus';
import { Botones, Campo, Falla } from './comun';
import { useEnvio, type Errores } from './useEnvio';
import './campus.css';
import './admin.css';

type Filtro = 'TODOS' | 'ACTIVO' | 'INACTIVO';
type Edicion = { tipo: 'nueva' } | { tipo: 'zona'; id: string } | null;

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'TODOS', texto: 'Todas' },
  { valor: 'ACTIVO', texto: 'Activas' },
  { valor: 'INACTIVO', texto: 'Inactivas' },
];

// El código identifica el punto de encuentro (p. ej. MP-H-01) y es fijo (RF-04):
// solo se escribe al crear y queda bloqueado al modificar.
function ZonaForm({ inicial, onGuardar, onCancelar }: {
  inicial?: ZonaSegura; onGuardar: (datos: ZonaSeguraRequest) => Promise<void>; onCancelar: () => void;
}) {
  const [codigo, setCodigo] = useState(inicial?.codigo ?? '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [ubicacion, setUbicacion] = useState(inicial?.ubicacion ?? '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [capacidad, setCapacidad] = useState(inicial ? String(inicial.capacidad) : '');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);
  const id = inicial?.id ?? 'nueva';

  const validar = () => {
    const e: Errores = {};
    if (!inicial && !codigo.trim()) e.codigo = 'El código es obligatorio.';
    else if (codigo.trim().length > 50) e.codigo = 'El código no puede superar 50 caracteres.';
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    else if (nombre.trim().length > 100) e.nombre = 'El nombre no puede superar 100 caracteres.';
    if (!ubicacion.trim()) e.ubicacion = 'La ubicación es obligatoria.';
    else if (ubicacion.trim().length > 255) e.ubicacion = 'La ubicación no puede superar 255 caracteres.';
    if (!descripcion.trim()) e.descripcion = 'La descripción es obligatoria.';
    if (!/^\d+$/.test(capacidad.trim()) || Number(capacidad.trim()) < 1) e.capacidad = 'Escribe una capacidad entera mayor que 0.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), {
        codigo: codigo.trim(), nombre: nombre.trim(), ubicacion: ubicacion.trim(),
        descripcion: descripcion.trim(), capacidad: Number(capacidad.trim()),
      });
    }}>
      <div className="cs-campos">
        <Campo id={`zona-codigo-${id}`} etiqueta={inicial ? 'Código (no se puede cambiar)' : 'Código'} error={errores.codigo}>
          <input id={`zona-codigo-${id}`} value={codigo} placeholder="MP-H-01" disabled={!!inicial} onChange={(e) => setCodigo(e.target.value)} />
        </Campo>
        <Campo id={`zona-nombre-${id}`} etiqueta="Nombre" error={errores.nombre}>
          <input id={`zona-nombre-${id}`} value={nombre} placeholder="Plazoleta frente al Edificio H" onChange={(e) => setNombre(e.target.value)} />
        </Campo>
      </div>
      <div className="cs-campos">
        <Campo id={`zona-ubicacion-${id}`} etiqueta="Ubicación" error={errores.ubicacion}>
          <input id={`zona-ubicacion-${id}`} value={ubicacion} placeholder="Frente al bloque H" onChange={(e) => setUbicacion(e.target.value)} />
        </Campo>
        <Campo id={`zona-capacidad-${id}`} etiqueta="Capacidad (personas)" error={errores.capacidad}>
          <input id={`zona-capacidad-${id}`} inputMode="numeric" value={capacidad} placeholder="200" onChange={(e) => setCapacidad(e.target.value)} />
        </Campo>
      </div>
      <Campo id={`zona-descripcion-${id}`} etiqueta="Descripción" error={errores.descripcion}>
        <textarea id={`zona-descripcion-${id}`} value={descripcion} placeholder="Zona abierta y despejada" onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

export default function ZonesAdmin() {
  const [zonas, setZonas] = useState<ZonaSegura[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<CampusApiError | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('ACTIVO');
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aviso, setAviso] = useState<CampusApiError | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const roles = rolesDeSesion();
  const puedeGestionar = roles === null || roles.includes('ADMIN');

  const aplicar = useCallback((lista: ZonaSegura[]) => { setZonas(lista); setErrorCarga(null); }, []);

  useEffect(() => {
    let vigente = true;
    campus.zonas.listar(true)
      .then((lista) => { if (vigente) aplicar(lista); })
      .catch((e) => { if (vigente) setErrorCarga(comoError(e)); });
    return () => { vigente = false; };
  }, [aplicar]);

  const recargar = async () => {
    try {
      aplicar(await campus.zonas.listar(true));
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

  // El backend responde 422 con las rutas que impiden inactivar la zona: se muestra tal cual.
  const cambiarEstado = async (zona: ZonaSegura) => {
    setOcupado(zona.id);
    setAviso(null);
    try {
      await (zona.estado === 'ACTIVO' ? campus.zonas.inactivar(zona.id) : campus.zonas.reactivar(zona.id));
      await recargar();
    } catch (e) {
      setAviso(comoError(e));
    } finally {
      setOcupado(null);
    }
  };

  const cabecera = <PageHeader badge="ADMINISTRACIÓN" title="Zonas seguras" subtitle="Gestiona los puntos de encuentro del campus y su código." />;

  if (!zonas) {
    return (
      <>
        {cabecera}
        <main className="content">
          {errorCarga ? <Falla error={errorCarga} /> : <p className="cs-resumen">Cargando zonas seguras…</p>}
        </main>
      </>
    );
  }

  const activas = zonas.filter((z) => z.estado === 'ACTIVO').length;
  const inactivas = zonas.length - activas;
  const conteo: Record<Filtro, number> = { TODOS: zonas.length, ACTIVO: activas, INACTIVO: inactivas };
  const visibles = zonas.filter((z) => filtro === 'TODOS' || z.estado === filtro);

  return (
    <>
      {cabecera}
      <main className="content">
        {errorCarga && <Falla error={errorCarga} />}
        {aviso && <Falla error={aviso} />}

        <div className="cs-barra">
          <div className="cs-barra-titulo">
            <h2 className="title sm22">Puntos de encuentro</h2>
            <span className="cs-resumen">
              {activas} {activas === 1 ? 'activa' : 'activas'} · {inactivas} {inactivas === 1 ? 'inactiva' : 'inactivas'}
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
            <button type="button" className="btn red cs-agregar" onClick={() => editar({ tipo: 'nueva' })}>Crear zona segura</button>
          )}
        </div>

        {edicion?.tipo === 'nueva' && (
          <section className="cs-piso">
            <h3 className="cs-piso-titulo">Nueva zona segura</h3>
            <ZonaForm onCancelar={() => editar(null)}
              onGuardar={(datos) => guardar(() => campus.zonas.crear(datos))} />
          </section>
        )}

        {visibles.length === 0 && edicion?.tipo !== 'nueva' ? (
          <p className="cs-alert info">
            {zonas.length === 0
              ? 'Todavía no hay zonas seguras registradas.'
              : 'No hay zonas con este filtro. Prueba con «Todas».'}
          </p>
        ) : visibles.length > 0 && (
          <div className="cs-tabla">
            <table>
              <thead>
                <tr><th>Código</th><th>Nombre</th><th>Ubicación</th><th>Capacidad</th><th>Estado</th><th><span className="cs-oculto">Acciones</span></th></tr>
              </thead>
              <tbody>
                {visibles.map((zona) => {
                  const activa = zona.estado === 'ACTIVO';
                  if (edicion?.tipo === 'zona' && edicion.id === zona.id) {
                    return (
                      <tr key={zona.id}><td colSpan={6}>
                        <ZonaForm inicial={zona} onCancelar={() => editar(null)}
                          onGuardar={(datos) => guardar(() => campus.zonas.modificar(zona.id, {
                            nombre: datos.nombre, ubicacion: datos.ubicacion, descripcion: datos.descripcion, capacidad: datos.capacidad,
                          }))} />
                      </td></tr>
                    );
                  }
                  return (
                    <tr key={zona.id} className={activa ? '' : 'inactivo'}>
                      <td className="cs-codigo">{zona.codigo}</td>
                      <td>{zona.nombre}<span className="cs-sub">{zona.descripcion}</span></td>
                      <td className="cs-descripcion">{zona.ubicacion}</td>
                      <td>{zona.capacidad}</td>
                      <td><span className={`cs-estado ${activa ? 'ok' : 'info'}`}>{zona.estado}</span></td>
                      <td>
                        {puedeGestionar && (
                          <div className="cs-acciones">
                            {activa && (
                              <button type="button" className="cs-mini" onClick={() => editar({ tipo: 'zona', id: zona.id })}>Modificar</button>
                            )}
                            <button type="button" className={`cs-mini${activa ? ' peligro' : ''}`} disabled={ocupado === zona.id}
                              onClick={() => cambiarEstado(zona)}>
                              {ocupado === zona.id ? 'Guardando…' : activa ? 'Inactivar' : 'Reactivar'}
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
      </main>
    </>
  );
}
