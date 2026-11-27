import { useEffect, useState } from 'react';
import { campus, comoCampusError, type CampusApiError } from '../services/campus';
import type { Escalera, RutaConsultada, Salida } from '../types';
import { espacioListo, salidaUtil } from '../utils/verificacion';

/** Consultas de guía a la vez, igual que «Todo el edificio» en #/rutas. */
const EN_PARALELO = 4;

export interface EstadoRutas {
  escaleras: Escalera[];
  salidas: Salida[];
  /** Salidas útiles que tienen al menos una ruta exterior no bloqueada hacia una zona segura. */
  salidasConZona: Set<string>;
  /** null si la consulta de rutas por edificio falló. */
  rutas: { espacioId: string; espacioNombre: string; listo: boolean; sinDato: boolean }[] | null;
  errorRutas: CampusApiError | null;
}

async function leer(edificioId: string): Promise<EstadoRutas> {
  const [escaleras, salidas] = await Promise.all([
    campus.escaleras.listarPorEdificio(edificioId),
    campus.salidas.listarPorEdificio(edificioId),
  ]);

  const exteriores = Promise.all(salidas.filter(salidaUtil).map((s) =>
    campus.rutasExteriores.porSalida(s.id)
      .then((lista) => (lista.some((r) => r.estado !== 'BLOQUEADA') ? s.id : null))
      .catch(() => null)));

  // La misma consulta de rutas por edificio que usa #/rutas; MS02 no calcula ahí la guía, así que se completa
  // espacio por espacio como en «Todo el edificio».
  const rutas = campus.consulta.porEdificio(edificioId).then(async (lista) => {
    const completas = new Map<string, RutaConsultada | 'error'>();
    const cola = lista.filter((r) => !r.guia);
    const trabajar = async () => {
      for (let r = cola.shift(); r; r = cola.shift()) {
        const id = r.espacioId;
        completas.set(id, await campus.consulta.porEspacio(id).catch(() => 'error' as const));
      }
    };
    await Promise.all(Array.from({ length: EN_PARALELO }, trabajar));
    return lista.map((r) => {
      const completa = completas.get(r.espacioId);
      if (completa === 'error') return { espacioId: r.espacioId, espacioNombre: r.espacioNombre, listo: espacioListo(r), sinDato: !espacioListo(r) };
      const ruta = completa ?? r;
      return { espacioId: r.espacioId, espacioNombre: r.espacioNombre, listo: espacioListo({ ...r, guia: ruta.guia ?? r.guia }), sinDato: false };
    });
  });

  const [conZona, resultado] = await Promise.all([
    exteriores,
    rutas.then((lista) => ({ lista, error: null }), (e: unknown) => ({ lista: null, error: comoCampusError(e) })),
  ]);
  return {
    escaleras,
    salidas,
    salidasConZona: new Set(conZona.filter((id): id is string => id !== null)),
    rutas: resultado.lista,
    errorRutas: resultado.error,
  };
}

/**
 * Escaleras, salidas, rutas exteriores y rutas de los espacios de un edificio, para la lista de verificación. Se vuelve a
 * leer cada vez que cambia `version` (después de cualquier cambio en el detalle del edificio); mientras tanto se
 * conservan los datos anteriores y `actualizando` queda en true.
 */
export function useEstadoRutas(edificioId: string, activo: boolean, version: number) {
  const [estado, setEstado] = useState<EstadoRutas | null>(null);
  const [error, setError] = useState<CampusApiError | null>(null);
  // Versión de la última lectura terminada: mientras no alcance a `version`, se está actualizando
  const [leida, setLeida] = useState(-1);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    leer(edificioId)
      .then((datos) => { if (vigente) { setEstado(datos); setError(null); } })
      .catch((e) => { if (vigente) setError(comoCampusError(e)); })
      .finally(() => { if (vigente) setLeida(version); });
    return () => { vigente = false; };
  }, [edificioId, activo, version]);

  return { estado, error, actualizando: activo && leida !== version };
}
