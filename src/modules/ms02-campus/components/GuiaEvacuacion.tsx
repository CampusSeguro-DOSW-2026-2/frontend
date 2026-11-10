import { useState } from 'react';
import { campus, comoCampusError } from '../services/campus';
import type { CampusApiError } from '../services/campus';
import type { GuiaEvacuacion as Guia } from '../types';
import { MapaRuta } from './MapaRuta';
import { distancia, duracion } from '../utils/formato';
import { Falla } from './comun';
import '../styles/guia.css';

const SIN_GUIA: Guia = {
  edificioId: '', pisoId: '', requiereEscalera: false, escaleras: [],
  mensaje: 'No hay una guía de evacuación disponible para este espacio.',
};

// Una escalera recomendada por tramo (en orden) y las alternas entre paréntesis. Sin `tramo` (respuestas
// antiguas) se listan todas como opciones.
function textoEscaleras(escaleras: Guia['escaleras']): string {
  if (escaleras.every((e) => e.tramo === undefined)) return escaleras.map((e) => e.nombre).join(' o ');
  const tramos = new Map<number, Guia['escaleras']>();
  escaleras.forEach((e) => tramos.set(e.tramo ?? 1, [...(tramos.get(e.tramo ?? 1) ?? []), e]));
  return [...tramos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, lista]) => {
      const [principal, ...alternas] = lista;
      return alternas.length > 0
        ? `${principal.nombre} (alterna: ${alternas.map((a) => a.nombre).join(', ')})`
        : principal.nombre;
    })
    .join(' → ');
}

function GuiaDetalle({ guia }: { guia: Guia }) {
  // Sin salida o sin escalera utilizable el backend solo manda el aviso.
  if (!guia.salida) {
    return (
      <section className="cs-guia" aria-label="Guía de evacuación">
        <h4>Guía de evacuación</h4>
        <p className="cs-alert warn">{guia.mensaje ?? 'No hay una guía de evacuación disponible para este espacio.'}</p>
      </section>
    );
  }

  const exterior = guia.rutaExterior;
  const pasos = exterior?.pasos ?? [];
  const escalera = textoEscaleras(guia.escaleras);

  return (
    <section className="cs-guia" aria-label="Guía de evacuación">
      <h4>Guía de evacuación</h4>
      {guia.indicacion && <p className="cs-guia-indicacion">{guia.indicacion}</p>}
      <dl className="cs-guia-datos">
        <div>
          <dt>Escalera</dt>
          <dd>{guia.requiereEscalera ? escalera : 'No necesitas escalera: la salida está en tu piso'}</dd>
        </div>
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
 * Guía de una tarjeta de ruta. Al consultar un espacio la guía ya viene en la respuesta; al consultar
 * todo el edificio el backend no la calcula, así que se pide al abrirla para no hacer una consulta por espacio.
 */
export function GuiaDeRuta({ espacioId, inicial }: { espacioId: string; inicial?: Guia | null }) {
  const [guia, setGuia] = useState<Guia | null>(inicial ?? null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<CampusApiError | null>(null);

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

  if (guia) return <GuiaDetalle guia={guia} />;
  return (
    <div className="cs-guia-pedir">
      <button type="button" className="cs-mini" onClick={cargar} disabled={cargando}>
        {cargando ? 'Calculando guía…' : 'Ver guía de evacuación'}
      </button>
      {error && <Falla error={error} />}
    </div>
  );
}
