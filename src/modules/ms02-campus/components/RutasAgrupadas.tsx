import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Cargando } from '../../../shared/components/Cargando';
import { Mensaje } from '../../../shared/components/Mensaje';
import { campus } from '../services/campus';
import type { GuiaEvacuacion as Guia, RecomendacionPreventiva, RutaConsultada } from '../types';
import { textoEscaleras } from '../utils/escaleras';
import { mismaFrase } from '../utils/formato';
import { GuiaDetalle } from './GuiaEvacuacion';

/** Consultas de guía a la vez: suficiente para no esperar espacio por espacio sin saturar MS02. */
const EN_PARALELO = 4;

const ESTADOS = { DISPONIBLE: 'Disponible', RESTRINGIDA: 'Restringida', BLOQUEADA: 'Bloqueada' } as const;

interface Grupo {
  clave: string;
  guia: Guia;
  ruta: RutaConsultada;
  espacios: { ruta: RutaConsultada; guia: Guia }[];
}

const pisoYEscalera = (g: Guia) => [
  g.pisoNumero != null ? `Piso ${g.pisoNumero}` : null,
  g.requiereEscalera && g.escaleras.length > 0 ? textoEscaleras(g.escaleras) : 'Sin escalera',
].filter(Boolean).join(' · ');

/**
 * «Todo el edificio» en Consultar ruta: los espacios que comparten exactamente la misma ruta (misma salida, ruta exterior,
 * zona segura y estado) se muestran juntos, con la ruta y su mapa una sola vez y la lista de espacios que la usan, cada
 * uno con su piso y su escalera. Los espacios sin ruta van al final en una lista corta y las recomendaciones preventivas
 * se muestran una sola vez.
 *
 * MS02 no calcula la guía al consultar el edificio, así que se pide la de cada espacio con el servicio de consulta por
 * espacio que ya existe (de a {@link EN_PARALELO}).
 */
export function RutasAgrupadas({ rutas, fallback }: { rutas: RutaConsultada[]; fallback: (r: RutaConsultada) => ReactNode }) {
  const [guias, setGuias] = useState<Record<string, Guia | null | 'error'>>({});
  const pendientes = rutas.filter((r) => !(r.espacioId in guias) && !r.guia).length;

  useEffect(() => {
    let vigente = true;
    const cola = rutas.filter((r) => !r.guia).map((r) => r.espacioId);
    const trabajar = async () => {
      for (let id = cola.shift(); id && vigente; id = cola.shift()) {
        const espacio = id;
        const guia = await campus.consulta.porEspacio(espacio).then((r): Guia | null => r.guia ?? null).catch(() => 'error' as const);
        if (vigente) setGuias((g) => ({ ...g, [espacio]: guia }));
      }
    };
    for (let i = 0; i < EN_PARALELO; i += 1) void trabajar();
    return () => { vigente = false; };
  }, [rutas]);

  const { grupos, sinRuta, sueltas, recomendaciones } = useMemo(() => {
    const mapa = new Map<string, Grupo>();
    const sinRuta: { ruta: RutaConsultada; motivo?: string | null }[] = [];
    const sueltas: RutaConsultada[] = [];
    const recs = new Map<string, RecomendacionPreventiva>();
    for (const ruta of rutas) {
      ruta.recomendacionesPreventivas?.forEach((r) => recs.set(r.id, r));
      const leida = guias[ruta.espacioId];
      // Si la guía no se pudo calcular, el espacio queda con su tarjeta y «Ver guía de evacuación» para reintentar:
      // nunca se presenta como «sin ruta» algo que no se sabe
      if (leida === 'error') { sueltas.push(ruta); continue; }
      const guia = ruta.guia ?? leida ?? null;
      if (guia?.salida) {
        const zona = guia.zonaSeguraNombre ?? ruta.zonaSeguraNombre ?? '';
        const clave = [guia.salida.id, guia.rutaExterior?.id ?? '-', zona, ruta.estado ?? '-', ruta.destinoActivo === false ? 'off' : 'on'].join('|');
        const grupo = mapa.get(clave) ?? { clave, guia, ruta, espacios: [] };
        grupo.espacios.push({ ruta, guia });
        mapa.set(clave, grupo);
      } else if (ruta.tieneRuta) {
        sueltas.push(ruta); // ruta escrita a mano sin guía calculada: su tarjeta de siempre
      } else {
        sinRuta.push({ ruta, motivo: guia?.mensaje ?? ruta.mensaje });
      }
    }
    // Las rutas que más espacios usan, primero
    const grupos = [...mapa.values()].sort((a, b) => b.espacios.length - a.espacios.length);
    return { grupos, sinRuta, sueltas, recomendaciones: [...recs.values()] };
  }, [rutas, guias]);

  if (pendientes > 0) {
    const total = rutas.filter((r) => !r.guia).length;
    return <Cargando texto={`Calculando las rutas de ${total} espacios… (${total - pendientes} de ${total})`} />;
  }

  const conRuta = grupos.reduce((n, g) => n + g.espacios.length, 0);
  return (
    <>
      <p className="cs-resumen">
        {[
          `${rutas.length} ${rutas.length === 1 ? 'espacio' : 'espacios'}`,
          grupos.length > 0 ? `${grupos.length} ${grupos.length === 1 ? 'ruta' : 'rutas'} para ${conRuta} ${conRuta === 1 ? 'espacio' : 'espacios'}` : null,
          sinRuta.length > 0 ? `${sinRuta.length} sin ruta` : null,
        ].filter(Boolean).join(' · ')}
      </p>
      <div className="cs-lista">
        {grupos.map((g) => {
          const { ruta, guia } = g;
          const bloqueada = ruta.estado === 'BLOQUEADA' || ruta.destinoActivo === false;
          const tono = bloqueada ? 'stop' : ruta.estado === 'RESTRINGIDA' ? 'warn' : 'ok';
          // La indicación y el recorrido escrito a mano se muestran una vez y solo si todos los espacios los comparten
          const indicacion = g.espacios.every((e) => mismaFrase(e.guia.indicacion, guia.indicacion)) ? guia.indicacion : null;
          const recorrido = g.espacios.every((e) => mismaFrase(e.ruta.recorrido, ruta.recorrido)) && !mismaFrase(ruta.recorrido, indicacion)
            ? ruta.recorrido : null;
          return (
            <article key={g.clave} className={`cs-ruta ${tono}`}>
              <div className="ctop">
                <h3>Por «{guia.salida!.nombre}»{guia.zonaSeguraNombre ? ` hasta ${guia.zonaSeguraNombre}` : ''}</h3>
                <span className={`cs-estado ${tono}`}>{ruta.estado ? ESTADOS[ruta.estado] : 'Disponible'}</span>
              </div>
              {(ruta.motivo || (ruta.mensaje && tono !== 'ok')) && (
                <Mensaje tono={bloqueada ? 'error' : 'aviso'}>{ruta.motivo ?? ruta.mensaje}</Mensaje>
              )}
              <section className="cs-espacios-ruta" aria-label="Espacios que usan esta ruta">
                <h4>{g.espacios.length === 1 ? '1 espacio usa esta ruta' : `${g.espacios.length} espacios usan esta ruta`}</h4>
                <ul>
                  {g.espacios.map((e) => (
                    <li key={e.ruta.espacioId}><b>{e.ruta.espacioNombre}</b><span>{pisoYEscalera(e.guia)}</span></li>
                  ))}
                </ul>
              </section>
              {(indicacion || recorrido) && <p className="cs-guia-indicacion cs-recorrido">{indicacion ?? recorrido}</p>}
              <GuiaDetalle guia={guia} compartida />
            </article>
          );
        })}
        {sueltas.map((r) => fallback(r))}
      </div>

      {sinRuta.length > 0 && (
        <section className="cs-sin-ruta" aria-labelledby="cs-sin-ruta-t">
          <h3 id="cs-sin-ruta-t">Sin ruta de evacuación ({sinRuta.length})</h3>
          <p className="cs-sub">Desde estos espacios siga la señalización de evacuación o pida ayuda a un brigadista.</p>
          <ul>
            {sinRuta.map(({ ruta, motivo }) => (
              <li key={ruta.espacioId}><b>{ruta.espacioNombre}</b>{motivo && <span>{motivo}</span>}</li>
            ))}
          </ul>
        </section>
      )}

      {recomendaciones.length > 0 && (
        <section className="cs-preventivas" aria-label="Recomendaciones preventivas">
          <h4>Recomendaciones preventivas</h4>
          <ul>
            {recomendaciones.map((r) => (
              <li key={r.id}>
                <strong>{r.titulo}</strong>
                <span className="cs-ambito">{r.ambito === 'EDIFICIO' ? 'Para este edificio' : 'Para algunos tipos de espacio'}</span>
                <p>{r.recomendacion}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
