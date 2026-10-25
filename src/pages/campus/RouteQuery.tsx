import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../../components/Layout';
import { MapIcon } from '../../components/Icons';
import { campus, CampusApiError } from '../../services/campus';
import type { Edificio, Espacio, EstadoRuta, RutaConsultada } from '../../types/campus';
import './campus.css';

type Tono = 'ok' | 'warn' | 'stop' | 'info';

const ESTADOS: Record<EstadoRuta, { texto: string; tono: Tono }> = {
  DISPONIBLE: { texto: 'DISPONIBLE', tono: 'ok' },
  RESTRINGIDA: { texto: 'RESTRINGIDA', tono: 'warn' },
  BLOQUEADA: { texto: 'BLOQUEADA', tono: 'stop' },
};

const comoError = (e: unknown) =>
  e instanceof CampusApiError ? e : new CampusApiError(0, 'ERROR', 'Ocurrió un error inesperado. Inténtalo más tarde.', {}, '');

function tonoDe(r: RutaConsultada): Tono {
  if (!r.tieneRuta) return 'info';
  if (!r.destinoActivo) return 'stop';
  return r.estado ? ESTADOS[r.estado].tono : 'info';
}

function Falla({ error }: { error: CampusApiError }) {
  return (
    <p className="cs-alert stop" role="alert">
      {error.message}
      {error.correlationId && <small>Código para soporte: {error.correlationId}</small>}
    </p>
  );
}

function Resultado({ ruta }: { ruta: RutaConsultada }) {
  const tono = tonoDe(ruta);
  const estado = ruta.estado ? ESTADOS[ruta.estado] : null;
  return (
    <article className={`cs-ruta ${tono}`}>
      <div className="ctop">
        <h3>{ruta.espacioNombre}</h3>
        {estado ? <span className={`cs-estado ${estado.tono}`}>{estado.texto}</span> : <span className="cs-estado info">SIN RUTA</span>}
      </div>
      {ruta.tieneRuta && (
        <>
          <div className="cs-destino">
            <MapIcon />
            <div>
              <small>Zona segura</small>
              <p>{ruta.zonaSeguraNombre ?? 'Zona sin información'}</p>
              {ruta.zonaSeguraUbicacion && <span>{ruta.zonaSeguraUbicacion}</span>}
            </div>
          </div>
          {ruta.recorrido && <div className="sm"><small>Recorrido</small><p className="cs-recorrido">{ruta.recorrido}</p></div>}
          {ruta.motivo && <div className="sm"><small>Motivo</small><p>{ruta.motivo}</p></div>}
        </>
      )}
      {ruta.mensaje && <p className={`cs-alert ${tono}`}>{ruta.mensaje}</p>}
    </article>
  );
}

function resumen(rutas: RutaConsultada[]) {
  const contar = (f: (r: RutaConsultada) => boolean) => rutas.filter(f).length;
  const partes = [
    `${rutas.length} ${rutas.length === 1 ? 'espacio' : 'espacios'}`,
    `${contar((r) => r.estado === 'DISPONIBLE' && r.destinoActivo === true)} con ruta disponible`,
  ];
  const restringidas = contar((r) => r.estado === 'RESTRINGIDA');
  const bloqueadas = contar((r) => r.estado === 'BLOQUEADA');
  const sinRuta = contar((r) => !r.tieneRuta);
  if (restringidas) partes.push(`${restringidas} ${restringidas === 1 ? 'restringida' : 'restringidas'}`);
  if (bloqueadas) partes.push(`${bloqueadas} ${bloqueadas === 1 ? 'bloqueada' : 'bloqueadas'}`);
  if (sinRuta) partes.push(`${sinRuta} sin ruta`);
  return partes.join(' · ');
}

export default function RouteQuery() {
  const [edificios, setEdificios] = useState<Edificio[] | null>(null);
  const [espacios, setEspacios] = useState<Espacio[] | null>(null);
  const [edificioId, setEdificioId] = useState('');
  const [espacioId, setEspacioId] = useState('');
  const [rutas, setRutas] = useState<RutaConsultada[] | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<CampusApiError | null>(null);
  const edificioActual = useRef('');

  useEffect(() => {
    campus.edificios.listar()
      .then(setEdificios)
      .catch((e) => { setEdificios([]); setError(comoError(e)); });
  }, []);

  const elegirEdificio = (id: string) => {
    edificioActual.current = id;
    setEdificioId(id);
    setEspacioId('');
    setEspacios(null);
    setRutas(null);
    setError(null);
    if (!id) return;
    campus.espacios.listarPorEdificio(id)
      .then((lista) => { if (edificioActual.current === id) setEspacios(lista); })
      .catch((e) => { if (edificioActual.current === id) { setEspacios([]); setError(comoError(e)); } });
  };

  const consultar = async () => {
    if (!edificioId) return;
    setConsultando(true);
    setError(null);
    try {
      setRutas(espacioId ? [await campus.consulta.porEspacio(espacioId)] : await campus.consulta.porEdificio(edificioId));
    } catch (e) {
      setRutas(null);
      setError(comoError(e));
    } finally {
      setConsultando(false);
    }
  };

  const edificio = edificios?.find((e) => e.id === edificioId);

  return (
    <>
      <PageHeader badge="EVACUACIÓN" title="Rutas de evacuación"
        subtitle="Consulta la ruta recomendada desde tu edificio o salón hasta la zona segura." context="Campus y seguridad" />
      <main className="content">
        <form className="cs-form" onSubmit={(e) => { e.preventDefault(); consultar(); }}>
          <div className="field">
            <label htmlFor="cs-edificio">Edificio</label>
            <div className="input">
              <select id="cs-edificio" value={edificioId} disabled={!edificios?.length} onChange={(e) => elegirEdificio(e.target.value)}>
                <option value="">{edificios === null ? 'Cargando edificios…' : 'Selecciona un edificio'}</option>
                {edificios?.map((e) => <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="cs-espacio">Espacio <span className="cs-opcional">(opcional)</span></label>
            <div className="input">
              <select id="cs-espacio" value={espacioId} disabled={!edificioId || espacios === null} onChange={(e) => { setEspacioId(e.target.value); setRutas(null); }}>
                <option value="">{edificioId && espacios === null ? 'Cargando espacios…' : 'Todo el edificio'}</option>
                {espacios?.map((s) => <option key={s.id} value={s.id}>{s.codigo} · {s.nombre}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn red" disabled={!edificioId || consultando}>
            <MapIcon />{consultando ? 'Consultando…' : 'Consultar ruta'}
          </button>
        </form>

        {edificios?.length === 0 && !error && <p className="cs-alert info">Aún no hay edificios activos registrados.</p>}
        {error && <Falla error={error} />}

        {rutas && (
          <section className="cs-resultados" aria-live="polite">
            <div className="cs-cabecera">
              <h2 className="title sm22">{espacioId ? 'Ruta del espacio' : `Rutas de ${edificio?.nombre ?? 'el edificio'}`}</h2>
              {!espacioId && rutas.length > 0 && <span className="cs-resumen">{resumen(rutas)}</span>}
            </div>
            {rutas.length === 0
              ? <p className="cs-alert info">Este edificio no tiene espacios disponibles para consultar.</p>
              : <div className="cs-lista">{rutas.map((r) => <Resultado key={r.espacioId} ruta={r} />)}</div>}
          </section>
        )}
      </main>
    </>
  );
}
