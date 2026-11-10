import { useRef, useState } from 'react';
import { campus, comoCampusError } from '../services/campus';
import type { CampusApiError } from '../services/campus';
import type { Edificio, EstadoRuta, ResumenGeneracionRutas, RutaExterior, Salida, ZonaSegura } from '../types';
import { distancia, duracion } from '../utils/formato';
import { useEnvio, type Errores } from '../hooks/useEnvio';
import { Campo, Falla } from './comun';
import '../styles/guia.css';

const TONOS: Record<EstadoRuta, string> = { DISPONIBLE: 'ok', RESTRINGIDA: 'warn', BLOQUEADA: 'stop' };

const fecha = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function Recorrido({ ruta, zona }: { ruta: RutaExterior; zona?: string }) {
  return (
    <article className="cs-exterior">
      <div className="cs-exterior-cabecera">
        <strong>{zona ?? 'Zona segura'}</strong>
        <span className={`cs-estado ${TONOS[ruta.estado]}`}>{ruta.estado}</span>
      </div>
      <p>
        {ruta.distanciaMetros != null ? distancia(ruta.distanciaMetros) : 'Sin distancia'}
        {ruta.duracionSegundos != null && ` · unos ${duracion(ruta.duracionSegundos)}`}
        <span className="cs-sub">Calculada el {fecha(ruta.calculadaEn)}</span>
      </p>
      {ruta.motivo && <p className="cs-alert warn">{ruta.motivo}</p>}
      {ruta.pasos.length > 0 && (
        <details className="cs-guia-pasos">
          <summary>Pasos del recorrido ({ruta.pasos.length})</summary>
          <ol>
            {ruta.pasos.map((p, i) => (
              <li key={i}>
                {p.instruccion}
                {p.distanciaMetros > 0 && <span> · {distancia(p.distanciaMetros)}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </article>
  );
}

const porDistancia = (a: RutaExterior, b: RutaExterior) =>
  (a.distanciaMetros ?? Number.POSITIVE_INFINITY) - (b.distanciaMetros ?? Number.POSITIVE_INFINITY);

// El navegador (15 s) o el Gateway pueden cortar la espera aunque MS02 siga generando rutas.
const seCortoLaEspera = (e: CampusApiError) => e.status === 504 || e.codigo === 'TIEMPO_AGOTADO';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Genera de una vez las rutas de todas las salidas del campus hacia sus zonas seguras más cercanas. Solo ADMIN. */
function GeneradorRutas() {
  const [enCurso, setEnCurso] = useState<'faltantes' | 'todas' | null>(null);
  const [resumen, setResumen] = useState<ResumenGeneracionRutas | null>(null);
  const [error, setError] = useState<CampusApiError | null>(null);

  const generar = async (recalcular: boolean) => {
    setEnCurso(recalcular ? 'todas' : 'faltantes');
    setResumen(null);
    setError(null);
    try {
      setResumen(await campus.rutasExteriores.generar(recalcular));
    } catch (e) {
      setError(comoCampusError(e));
    } finally {
      setEnCurso(null);
    }
  };

  return (
    <div className="cs-subeditor">
      <h4>Generar rutas del campus</h4>
      <p className="cs-resumen">
        Cada salida se conecta con sus zonas seguras más cercanas. Normalmente no hace falta pulsar nada: las rutas se
        generan solas al crear o mover una salida o una zona segura (la zona necesita coordenadas). Usa esto para completar
        lo que haya faltado, por ejemplo si el servicio de mapas no respondió.
      </p>
      <div className="cs-form-botones">
        <button type="button" className="cs-mini primario" disabled={enCurso !== null} onClick={() => generar(false)}>
          {enCurso === 'faltantes' ? 'Generando…' : 'Generar las que faltan'}
        </button>
        <button type="button" className="cs-mini" disabled={enCurso !== null} onClick={() => generar(true)}>
          {enCurso === 'todas' ? 'Recalculando…' : 'Recalcular todas'}
        </button>
      </div>
      {resumen && (
        <p className={`cs-alert ${resumen.interrumpida ? 'warn' : 'info'}`} role="status">
          {resumen.interrumpida
            ? 'El servicio de mapas dejó de responder y se detuvo la generación. Vuelve a intentarlo en unos minutos; solo se calcularán las que falten.'
            : resumen.generadas === 0 && resumen.omitidas === 0
              ? 'No hay rutas pendientes: las salidas disponibles ya tienen las suyas, o todavía no hay zonas seguras con coordenadas.'
              : `${plural(resumen.generadas, 'ruta generada', 'rutas generadas')}.`}
          {resumen.omitidas > 0 && (
            <small>
              {plural(resumen.omitidas, 'ruta omitida', 'rutas omitidas')}: no hay recorrido a pie, o la salida o la zona no están disponibles.
            </small>
          )}
        </p>
      )}
      {error && (seCortoLaEspera(error)
        ? <p className="cs-alert info" role="status">
            La generación puede seguir en segundo plano aunque la respuesta tardó demasiado. Revisa las rutas guardadas de
            una salida en un momento.
          </p>
        : <Falla error={error} />)}
    </div>
  );
}

/**
 * Muestra las rutas exteriores guardadas de cada salida y permite generarlas o recalcularlas.
 * Generar y calcular son solo de ADMIN; consultar lo que ya está guardado también lo puede hacer COORDINADOR.
 */
export function RutaExteriorAdmin({ edificios, zonas, puedeCalcular }: {
  edificios: Edificio[]; zonas: ZonaSegura[]; puedeCalcular: boolean;
}) {
  const [edificioId, setEdificioId] = useState('');
  const [salidas, setSalidas] = useState<Salida[] | null>(null);
  const [salidaId, setSalidaId] = useState('');
  const [zonaId, setZonaId] = useState('');
  const [guardadas, setGuardadas] = useState<RutaExterior[] | null>(null);
  const [resultado, setResultado] = useState<RutaExterior | null>(null);
  const [errorCarga, setErrorCarga] = useState<CampusApiError | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const edificioActual = useRef('');
  const salidaActual = useRef('');

  const zonasActivas = zonas.filter((z) => z.estado === 'ACTIVO');
  const nombreZona = new Map(zonas.map((z) => [z.id, `${z.codigo} · ${z.nombre}`]));
  const tieneCoordenadas = (z: ZonaSegura) => z.latitud != null && z.longitud != null;

  const cargarGuardadas = async (id: string) => {
    try {
      const lista = await campus.rutasExteriores.porSalida(id);
      if (salidaActual.current === id) setGuardadas(lista);
    } catch (e) {
      if (salidaActual.current === id) { setGuardadas([]); setErrorCarga(comoCampusError(e)); }
    }
  };

  const actualizar = async () => {
    setActualizando(true);
    setErrorCarga(null);
    await cargarGuardadas(salidaId);
    setActualizando(false);
  };

  const elegirEdificio = (id: string) => {
    edificioActual.current = id;
    salidaActual.current = '';
    setEdificioId(id);
    setSalidaId('');
    setSalidas(null);
    setGuardadas(null);
    setResultado(null);
    setErrorCarga(null);
    if (!id) return;
    campus.salidas.listarPorEdificio(id)
      .then((lista) => { if (edificioActual.current === id) setSalidas(lista); })
      .catch((e) => { if (edificioActual.current === id) { setSalidas([]); setErrorCarga(comoCampusError(e)); } });
  };

  const elegirSalida = (id: string) => {
    salidaActual.current = id;
    setSalidaId(id);
    setGuardadas(null);
    setResultado(null);
    setErrorCarga(null);
    if (id) cargarGuardadas(id);
  };

  const { errores, general, guardando, enviar } = useEnvio(async (d: { salidaId: string; zonaSeguraId: string }) => {
    const ruta = await campus.rutasExteriores.calcular(d);
    setResultado(ruta);
    await cargarGuardadas(d.salidaId);
  });

  const validar = () => {
    const e: Errores = {};
    if (!salidaId) e.salidaId = 'Selecciona la salida de origen.';
    if (!zonaId) e.zonaSeguraId = 'Selecciona la zona segura de destino.';
    return e;
  };

  const sinSalidas = !edificioId ? 'Selecciona primero un edificio'
    : salidas === null ? 'Cargando salidas…'
    : salidas.length === 0 ? 'Este edificio no tiene salidas disponibles'
    : 'Selecciona una salida';

  return (
    <section className="cs-piso" aria-label="Ruta exterior">
      <div className="cs-barra-titulo">
        <h2 className="title sm22">Ruta exterior</h2>
        <span className="cs-resumen">Recorrido a pie desde cada salida hasta sus zonas seguras más cercanas, calculado con OpenStreetMap.</span>
      </div>

      {puedeCalcular && <GeneradorRutas />}

      <form className="cs-editor" noValidate onSubmit={(e) => { e.preventDefault(); enviar(validar(), { salidaId, zonaSeguraId: zonaId }); }}>
        <div className="cs-campos">
          <Campo id="exterior-edificio" etiqueta="Edificio">
            <select id="exterior-edificio" value={edificioId} onChange={(e) => elegirEdificio(e.target.value)}>
              <option value="">Selecciona un edificio</option>
              {edificios.filter((e) => e.estado === 'ACTIVO').map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Campo>
          <Campo id="exterior-salida" etiqueta="Salida de origen" error={errores.salidaId}>
            <select id="exterior-salida" value={salidaId} disabled={!salidas?.length} onChange={(e) => elegirSalida(e.target.value)}>
              <option value="">{sinSalidas}</option>
              {salidas?.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </Campo>
          {puedeCalcular && (
            <Campo id="exterior-zona" etiqueta="Zona segura de destino" error={errores.zonaSeguraId}>
              <select id="exterior-zona" value={zonaId} onChange={(e) => setZonaId(e.target.value)}>
                <option value="">Selecciona una zona</option>
                {zonasActivas.map((z) => (
                  <option key={z.id} value={z.id} disabled={!tieneCoordenadas(z)}>
                    {z.codigo} · {z.nombre}{tieneCoordenadas(z) ? '' : ' (sin coordenadas)'}
                  </option>
                ))}
              </select>
            </Campo>
          )}
        </div>
        {puedeCalcular && (
          <div className="cs-form-botones">
            <button type="submit" className="cs-mini primario" disabled={guardando}>{guardando ? 'Calculando…' : 'Calcular o recalcular este par'}</button>
          </div>
        )}
        {general && <Falla error={general} />}
      </form>

      {errorCarga && <Falla error={errorCarga} />}

      {resultado && (
        <div className="cs-subeditor">
          <h4>Ruta calculada</h4>
          <Recorrido ruta={resultado} zona={nombreZona.get(resultado.zonaSeguraDestinoId)} />
        </div>
      )}

      {salidaId && guardadas && (
        <div className="cs-subeditor">
          <h4>Rutas guardadas de esta salida</h4>
          {guardadas.length === 0
            ? <p className="cs-vacio">Esta salida todavía no tiene rutas exteriores. Si acabas de crearla o moverla, se generan en unos segundos: pulsa Actualizar.</p>
            : [...guardadas].sort(porDistancia).map((r) => <Recorrido key={r.id} ruta={r} zona={nombreZona.get(r.zonaSeguraDestinoId)} />)}
          <div className="cs-form-botones">
            <button type="button" className="cs-mini" disabled={actualizando} onClick={actualizar}>{actualizando ? 'Actualizando…' : 'Actualizar'}</button>
          </div>
        </div>
      )}
    </section>
  );
}
