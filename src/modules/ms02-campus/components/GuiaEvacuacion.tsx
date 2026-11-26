import { Mensaje } from '../../../shared/components/Mensaje';
import { useEffect, useRef, useState } from 'react';
import { campus, comoCampusError } from '../services/campus';
import type { CampusApiError } from '../services/campus';
import type { GuiaEvacuacion as Guia } from '../types';
import { MapaRuta } from './MapaRuta';
import { distancia, duracion } from '../utils/formato';
import { textoEscaleras } from '../utils/escaleras';
import { Falla } from './comun';
import '../styles/guia.css';

const SIN_GUIA: Guia = {
  edificioId: '', pisoId: '', requiereEscalera: false, escaleras: [],
  mensaje: 'No hay una guía de evacuación disponible para este espacio.',
};

/**
 * Detalle de la guía. En una ruta compartida por varios espacios (RutasAgrupadas) la escalera y la indicación cambian
 * de un espacio a otro: `compartida` las quita de aquí y cada espacio las muestra en su línea.
 */
export function GuiaDetalle({ guia, compartida = false }: { guia: Guia; compartida?: boolean }) {
  // Sin salida o sin escalera utilizable el backend solo manda el aviso.
  if (!guia.salida) {
    return (
      <section className="cs-guia" aria-label="Guía de evacuación">
        <h4>Guía de evacuación</h4>
        <Mensaje tono="aviso">{guia.mensaje ?? 'No hay una guía de evacuación disponible para este espacio.'}</Mensaje>
      </section>
    );
  }

  const exterior = guia.rutaExterior;
  const pasos = exterior?.pasos ?? [];
  const escalera = textoEscaleras(guia.escaleras);

  return (
    <section className="cs-guia" aria-label="Guía de evacuación">
      <h4>Guía de evacuación</h4>
      {!compartida && guia.indicacion && <p className="cs-guia-indicacion">{guia.indicacion}</p>}
      <dl className="cs-guia-datos">
        {!compartida && (
          <div>
            <dt>Escalera</dt>
            <dd>{guia.requiereEscalera ? escalera : 'No necesita escalera: la salida está en su piso'}</dd>
          </div>
        )}
        <div>
          <dt>Salida</dt>
          <dd>{guia.salida.nombre}</dd>
        </div>
        <div>
          <dt>Ruta exterior</dt>
          <dd>
            {exterior?.distanciaMetros != null
              ? `${distancia(exterior.distanciaMetros)}${exterior.duracionSegundos != null ? ` · unos ${duracion(exterior.duracionSegundos)}` : ''}`
              : 'Sin distancia calculada'}
          </dd>
        </div>
        {guia.zonaSeguraNombre && (
          <div>
            <dt>Zona segura</dt>
            <dd>{guia.zonaSeguraNombre}</dd>
          </div>
        )}
      </dl>
      {exterior && exterior.geometria.length > 0 && (
        <MapaRuta
          ruta={exterior}
          salida={guia.salida}
          zonaSeguraNombre={guia.zonaSeguraNombre}
        />
      )}
      {pasos.length > 0 && (
        <details className="cs-guia-pasos">
          <summary>Pasos de la ruta exterior ({pasos.length})</summary>
          <ol>
            {pasos.map((p, i) => (
              <li key={i}>
                {p.instruccion}
                {p.distanciaMetros > 0 && <span> · {distancia(p.distanciaMetros)}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

/**
 * Guía de una tarjeta de ruta. Al consultar un espacio la guía ya viene en la respuesta y se muestra de una vez. Al
 * consultar todo el edificio el backend no la calcula: con `automatica` (el espacio ya tiene su ruta calculada) se pide
 * sola cuando la tarjeta aparece en pantalla, sin el toque extra y sin pedir todas a la vez; si no, queda el botón.
 */
export function GuiaDeRuta({ espacioId, inicial, automatica = false }: { espacioId: string; inicial?: Guia | null; automatica?: boolean }) {
  const [guia, setGuia] = useState<Guia | null>(inicial ?? null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<CampusApiError | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const pedida = useRef(false);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await campus.consulta.porEspacio(espacioId);
      setGuia(respuesta.guia ?? SIN_GUIA);
    } catch (e) {
      setError(comoCampusError(e));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const nodo = caja.current;
    if (!automatica || guia || !nodo || typeof IntersectionObserver === 'undefined') return undefined;
    const observador = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting) && !pedida.current) {
        pedida.current = true;
        observador.disconnect();
        void cargar();
      }
    }, { rootMargin: '200px 0px' });
    observador.observe(nodo);
    return () => observador.disconnect();
    // cargar solo depende del espacio
  }, [automatica, guia, espacioId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (guia) return <GuiaDetalle guia={guia} />;
  return (
    <div className="cs-guia-pedir" ref={caja} aria-busy={cargando || undefined}>
      {cargando
        ? <p className="cs-sub" role="status">Calculando la guía de evacuación…</p>
        : (
            <button type="button" className="btn white sm" onClick={() => void cargar()}>
              {error ? 'Intentar de nuevo' : 'Ver guía de evacuación'}
            </button>
          )}
      {error && <Falla error={error} />}
    </div>
  );
}
