import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../components/Layout';
import { campus, CampusApiError, comoCampusError as comoError, rolesDeSesion } from '../../services/campus';
import type { AmbitoRecomendacion, Edificio, RecomendacionPreventiva, RecomendacionPreventivaRequest, TipoEspacio } from '../../types/campus';
import { Botones, Campo, Falla } from './comun';
import { TIPOS } from './tipos';
import { useEnvio, type Errores } from './useEnvio';
import './campus.css';

type Edicion = { tipo: 'nueva' } | { tipo: 'modificar'; id: string } | { tipo: 'inactivar'; id: string } | null;

const leer = () => Promise.all([campus.recomendaciones.listar(), campus.edificios.listar(true)]);

function RecomendacionForm({ inicial, edificios, onGuardar, onCancelar }: {
  inicial?: RecomendacionPreventiva; edificios: Edificio[];
  onGuardar: (datos: RecomendacionPreventivaRequest) => Promise<void>; onCancelar: () => void;
}) {
  const [ambito, setAmbito] = useState<AmbitoRecomendacion>(inicial?.ambito ?? 'EDIFICIO');
  const [edificioId, setEdificioId] = useState(inicial?.edificioId ?? '');
  const [tipo, setTipo] = useState<TipoEspacio | ''>(inicial?.tipoEspacio ?? '');
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [texto, setTexto] = useState(inicial?.recomendacion ?? '');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);
  const id = inicial?.id ?? 'nueva';

  const validar = () => {
    const e: Errores = {};
    if (ambito === 'EDIFICIO' && !edificioId) e.edificioId = 'Selecciona el edificio.';
    if (ambito === 'TIPO_ESPACIO' && !tipo) e.tipoEspacio = 'Selecciona el tipo de espacio.';
    if (!titulo.trim()) e.titulo = 'El título es obligatorio.';
    else if (titulo.trim().length > 150) e.titulo = 'El título no puede superar 150 caracteres.';
    if (!texto.trim()) e.recomendacion = 'Escribe la recomendación.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), {
        ambito,
        edificioId: ambito === 'EDIFICIO' ? edificioId : undefined,
        tipoEspacio: ambito === 'TIPO_ESPACIO' ? (tipo as TipoEspacio) : undefined,
        titulo: titulo.trim(),
        recomendacion: texto.trim(),
      });
    }}>
      <fieldset className="cs-ambito-opciones">
        <legend className="lbl">Aplica a</legend>
        <div className="pills">
          <button type="button" className="pill" aria-pressed={ambito === 'EDIFICIO'} onClick={() => setAmbito('EDIFICIO')}>Un edificio</button>
          <button type="button" className="pill" aria-pressed={ambito === 'TIPO_ESPACIO'} onClick={() => setAmbito('TIPO_ESPACIO')}>Un tipo de espacio</button>
        </div>
      </fieldset>
      <div className="cs-campos">
        {ambito === 'EDIFICIO' ? (
          <Campo id={`rec-edificio-${id}`} etiqueta="Edificio" error={errores.edificioId}>
            <select id={`rec-edificio-${id}`} value={edificioId} onChange={(e) => setEdificioId(e.target.value)}>
              <option value="">Selecciona un edificio</option>
              {edificios.map((e) => <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}{e.estado === 'INACTIVO' ? ' (inactivo)' : ''}</option>)}
            </select>
          </Campo>
        ) : (
          <Campo id={`rec-tipo-${id}`} etiqueta="Tipo de espacio" error={errores.tipoEspacio}>
            <select id={`rec-tipo-${id}`} value={tipo} onChange={(e) => setTipo(e.target.value as TipoEspacio)}>
              <option value="">Selecciona un tipo</option>
              {Object.entries(TIPOS).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
            </select>
          </Campo>
        )}
        <Campo id={`rec-titulo-${id}`} etiqueta="Título" error={errores.titulo}>
          <input id={`rec-titulo-${id}`} value={titulo} maxLength={150} placeholder="Uso de escaleras en laboratorios" onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
      </div>
      <Campo id={`rec-texto-${id}`} etiqueta="Recomendación" error={errores.recomendacion}>
        <textarea id={`rec-texto-${id}`} rows={4} value={texto} placeholder="Apaga los equipos, deja las mochilas y sal por la escalera más cercana." onChange={(e) => setTexto(e.target.value)} />
      </Campo>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}

export default function PreventiveAdmin() {
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionPreventiva[] | null>(null);
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [errorCarga, setErrorCarga] = useState<CampusApiError | null>(null);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [aviso, setAviso] = useState<CampusApiError | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const roles = rolesDeSesion();
  const puedeGestionar = roles === null || roles.includes('ADMIN');

  const aplicar = useCallback(([r, e]: Awaited<ReturnType<typeof leer>>) => {
    setRecomendaciones(r);
    setEdificios(e);
    setErrorCarga(null);
  }, []);

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

  const inactivar = async (id: string) => {
    setOcupado(id);
    setAviso(null);
    try {
      await campus.recomendaciones.inactivar(id);
      await recargar();
      setEdicion(null);
    } catch (e) {
      setAviso(comoError(e));
    } finally {
      setOcupado(null);
    }
  };

  const nombreEdificio = new Map(edificios.map((e) => [e.id, e.nombre]));
  const porEdificio = (recomendaciones ?? []).filter((r) => r.ambito === 'EDIFICIO')
    .sort((a, b) => (nombreEdificio.get(a.edificioId ?? '') ?? '').localeCompare(nombreEdificio.get(b.edificioId ?? '') ?? ''));
  const porTipo = (recomendaciones ?? []).filter((r) => r.ambito === 'TIPO_ESPACIO')
    .sort((a, b) => TIPOS[a.tipoEspacio ?? 'SALON'].localeCompare(TIPOS[b.tipoEspacio ?? 'SALON']));

  const tarjeta = (r: RecomendacionPreventiva) => {
    const destino = r.ambito === 'EDIFICIO'
      ? nombreEdificio.get(r.edificioId ?? '') ?? 'Edificio desconocido'
      : TIPOS[r.tipoEspacio ?? 'SALON'];
    if (edicion?.tipo === 'modificar' && edicion.id === r.id) {
      return (
        <li key={r.id} className="cs-recomendacion editando">
          <h4>Modificar recomendación</h4>
          <RecomendacionForm inicial={r} edificios={edificios} onCancelar={() => editar(null)}
            onGuardar={(datos) => guardar(() => campus.recomendaciones.modificar(r.id, datos))} />
        </li>
      );
    }
    return (
      <li key={r.id} className="cs-recomendacion">
        <div className="cs-piso-cabecera">
          <div>
            <h4>{r.titulo}</h4>
            <span className="cs-sub">{destino}</span>
          </div>
          {puedeGestionar && edicion?.tipo !== 'inactivar' && (
            <div className="cs-acciones">
              <button type="button" className="cs-mini" onClick={() => editar({ tipo: 'modificar', id: r.id })}>Modificar</button>
              <button type="button" className="cs-mini peligro" onClick={() => editar({ tipo: 'inactivar', id: r.id })}>Inactivar</button>
            </div>
          )}
        </div>
        <p className="cs-texto">{r.recomendacion}</p>
        {edicion?.tipo === 'inactivar' && edicion.id === r.id && (
          <div className="cs-confirmar" role="group" aria-label="Confirmar inactivación">
            <p>La recomendación dejará de mostrarse en «Consultar ruta» y por ahora no se puede reactivar desde aquí.</p>
            <div className="cs-form-botones">
              <button type="button" className="cs-mini primario" disabled={ocupado === r.id} onClick={() => inactivar(r.id)}>{ocupado === r.id ? 'Inactivando…' : 'Sí, inactivar'}</button>
              <button type="button" className="cs-mini" disabled={ocupado === r.id} onClick={() => editar(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <PageHeader badge="ADMINISTRACIÓN" title="Información preventiva"
        subtitle="Recomendaciones que ven los usuarios al consultar su ruta de evacuación." context="Campus y seguridad" />
      <main className="content">
        {errorCarga && <Falla error={errorCarga} />}
        {aviso && <Falla error={aviso} />}
        {recomendaciones === null ? (
          !errorCarga && <p className="cs-resumen">Cargando recomendaciones…</p>
        ) : (
          <>
            <div className="cs-barra">
              <div className="cs-barra-titulo">
                <h2 className="title sm22">Recomendaciones activas</h2>
                <span className="cs-resumen">{porEdificio.length} por edificio · {porTipo.length} por tipo de espacio</span>
              </div>
              {puedeGestionar && (
                <button type="button" className="btn red cs-agregar" onClick={() => editar({ tipo: 'nueva' })}>Nueva recomendación</button>
              )}
            </div>

            {edicion?.tipo === 'nueva' && (
              <section className="cs-piso">
                <h3 className="cs-piso-titulo">Nueva recomendación</h3>
                <RecomendacionForm edificios={edificios} onCancelar={() => editar(null)}
                  onGuardar={(datos) => guardar(() => campus.recomendaciones.crear(datos))} />
              </section>
            )}

            {recomendaciones.length === 0 && edicion?.tipo !== 'nueva' && (
              <p className="cs-alert info">Aún no hay recomendaciones. Las que agregues aparecerán en la tarjeta de cada ruta.</p>
            )}

            {porEdificio.length > 0 && (
              <section className="cs-piso" aria-labelledby="rec-edificio">
                <h3 className="cs-piso-titulo" id="rec-edificio">Por edificio</h3>
                <ul className="cs-recomendaciones">{porEdificio.map(tarjeta)}</ul>
              </section>
            )}
            {porTipo.length > 0 && (
              <section className="cs-piso" aria-labelledby="rec-tipo">
                <h3 className="cs-piso-titulo" id="rec-tipo">Por tipo de espacio</h3>
                <ul className="cs-recomendaciones">{porTipo.map(tarjeta)}</ul>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
