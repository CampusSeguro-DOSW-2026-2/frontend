import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { campus } from '../../ms02-campus/services/campus';
import type { EdificioEvento } from '../types';

type Punto = [number, number];

/**
 * Posición de cada lugar del evento según lo registrado en MS02. MS02 no guarda coordenadas del edificio, así que se
 * ubica en el centro de sus salidas activas; una zona segura usa sus propias coordenadas. Sin coordenadas queda en la
 * lista de abajo. Se guarda por id para no repetir las consultas al volver a la pantalla.
 */
const posiciones = new Map<string, Promise<Punto | null>>();

const valido = (lat: number | null | undefined, lng: number | null | undefined): lat is number =>
  lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

function posicionDe(e: EdificioEvento): Promise<Punto | null> {
  let p = posiciones.get(e.ubicacionId);
  if (!p) {
    p = (e.tipoUbicacion === 'EDIFICIO'
      ? campus.salidas.listarPorEdificio(e.ubicacionId).then((salidas) => {
        const puntos = salidas.filter((s) => s.estado !== 'INACTIVO' && valido(s.latitud, s.longitud));
        if (!puntos.length) return null;
        return [
          puntos.reduce((n, s) => n + s.latitud, 0) / puntos.length,
          puntos.reduce((n, s) => n + s.longitud, 0) / puntos.length,
        ] as Punto;
      })
      : campus.zonas.obtener(e.ubicacionId).then((z) => (valido(z.latitud, z.longitud) ? [z.latitud, z.longitud!] as Punto : null)))
      .catch(() => { posiciones.delete(e.ubicacionId); return null; });
    posiciones.set(e.ubicacionId, p);
  }
  return p;
}

function Ajustar({ puntos }: { puntos: Punto[] }) {
  const mapa = useMap();
  const clave = puntos.map((p) => p.join(',')).join(';');
  useEffect(() => {
    if (puntos.length === 1) mapa.setView(puntos[0], 18);
    if (puntos.length > 1) mapa.fitBounds(L.latLngBounds(puntos), { padding: [40, 40], maxZoom: 18 });
    // Solo cuando cambian las posiciones
  }, [mapa, clave]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

interface Props {
  edificios: EdificioEvento[];
  miUbicacionId: string | null;
  deshabilitado: boolean;
  onElegir: (edificio: EdificioEvento) => void;
}

const conteo = (n: number) => (n === 1 ? '1 brigadista' : `${n} brigadistas`);
/** Rojo: su edificio. Ámbar: sin brigadistas (prioridad). Azul: los demás. */
const color = (e: EdificioEvento, mio: boolean) => (mio ? '#990000' : e.brigadistasAsignados === 0 ? '#D97706' : '#2563EB');

/**
 * Mapa del campus para la auto asignación: los edificios y zonas del evento sobre el mapa real (OpenStreetMap), en la
 * posición registrada en MS02 y con el número de brigadistas de cada uno. Tocar un lugar lo elige. Debajo, la misma
 * lista en botones (accesible con teclado), donde también quedan los lugares que MS02 aún no tiene ubicados.
 */
export default function MapaCampus({ edificios, miUbicacionId, deshabilitado, onElegir }: Props) {
  const [ubicados, setUbicados] = useState<Record<string, Punto | null> | null>(null);
  const ids = edificios.map((e) => e.ubicacionId).join(',');

  useEffect(() => {
    let vigente = true;
    Promise.all(edificios.map((e) => posicionDe(e).then((p) => [e.ubicacionId, p] as const)))
      .then((pares) => { if (vigente) setUbicados(Object.fromEntries(pares)); });
    return () => { vigente = false; };
    // Se recalcula cuando cambian los lugares del evento, no cuando cambian sus conteos
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps

  const enMapa = useMemo(
    () => edificios.filter((e) => ubicados?.[e.ubicacionId]).map((e) => ({ e, p: ubicados![e.ubicacionId] as Punto })),
    [edificios, ubicados],
  );
  const sinUbicar = ubicados ? edificios.filter((e) => !ubicados[e.ubicacionId]) : [];

  return (
    <div className="aa-map">
      {ubicados === null && <Cargando texto="Cargando el mapa del campus…" />}
      {ubicados !== null && enMapa.length > 0 && (
        <MapContainer className="aa-leaflet" center={enMapa[0].p} zoom={17} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Ajustar puntos={enMapa.map((x) => x.p)} />
          {enMapa.map(({ e, p }) => {
            const mio = e.ubicacionId === miUbicacionId;
            return (
              <CircleMarker key={e.ubicacionId} center={p} radius={mio ? 16 : 13}
                pathOptions={{ color: '#fff', weight: 3, fillColor: color(e, mio), fillOpacity: deshabilitado ? 0.5 : 0.95 }}
                eventHandlers={{ click: () => onElegir(e) }}>
                <Tooltip permanent direction="top" offset={[0, -12]} className="aa-tip">
                  <b>{e.nombre}</b> · {conteo(e.brigadistasAsignados)}{mio ? ' · su edificio' : ''}
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      )}
      {ubicados !== null && enMapa.length === 0 && (
        <Mensaje tono="info">Los lugares del evento todavía no tienen ubicación en el mapa del campus. Elija uno en la lista.</Mensaje>
      )}

      <div className="aa-legend" aria-hidden="true">
        <span><i className="l-mine" />Su edificio</span>
        <span><i className="l-empty" />Sin brigadistas</span>
        <span><i className="l-other" />Con brigadistas</span>
      </div>

      <p className="help aa-list-title">Lugares del evento{sinUbicar.length > 0 ? ' (los marcados con * aún no tienen ubicación en el mapa)' : ''}:</p>
      <div className="aa-extra" role="group" aria-label="Lugares del evento">
        {edificios.map((e) => (
          <button key={e.ubicacionId} type="button" className="pill" aria-pressed={e.ubicacionId === miUbicacionId}
            aria-disabled={deshabilitado || undefined} onClick={() => onElegir(e)}>
            {e.nombre}{sinUbicar.includes(e) ? ' *' : ''} · {conteo(e.brigadistasAsignados)}
          </button>
        ))}
      </div>
    </div>
  );
}
