import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import type { RutaExterior, SalidaGuia } from '../types';
import '../styles/mapa.css';
import 'leaflet/dist/leaflet.css';

type Punto = [number, number];

function AjustarMapa({ puntos }: { puntos: Punto[] }) {
  const mapa = useMap();

  useEffect(() => {
    if (puntos.length === 1) {
      mapa.setView(puntos[0], 17);
      return;
    }

    if (puntos.length > 1) {
      const limites = L.latLngBounds(
        puntos.map(([latitud, longitud]) => L.latLng(latitud, longitud)),
      );
      mapa.fitBounds(limites, { padding: [35, 35], maxZoom: 18 });
    }
  }, [mapa, puntos]);

  return null;
}

export function MapaRuta({
  ruta,
  salida,
  zonaSeguraNombre,
}: {
  ruta: RutaExterior;
  salida: SalidaGuia;
  zonaSeguraNombre?: string | null;
}) {
  const geometria = useMemo<Punto[]>(
    () => ruta.geometria.map((punto) => [punto.latitud, punto.longitud]),
    [ruta.geometria],
  );

  const salidaValida =
    salida.latitud != null &&
    salida.longitud != null &&
    Number.isFinite(salida.latitud) &&
    Number.isFinite(salida.longitud);

  const inicio: Punto | null = salidaValida
    ? [salida.latitud!, salida.longitud!]
    : geometria[0] ?? null;

  const destino = geometria[geometria.length - 1] ?? null;

  const puntos = useMemo(
    () => [
      ...(inicio ? [inicio] : []),
      ...geometria,
    ],
    [inicio?.[0], inicio?.[1], geometria],
  );

  if (geometria.length === 0) {
    return (
      <p className="cs-mapa-aviso">
        No hay coordenadas disponibles para mostrar el mapa de esta ruta.
      </p>
    );
  }

  return (
    <section className="cs-mapa-seccion" aria-label="Mapa de la ruta de evacuación">
      <div className="cs-mapa-cabecera">
        <h5>Mapa de evacuación</h5>
        <span>Salida → Zona segura</span>
      </div>

      <MapContainer
        className="cs-mapa-ruta"
        center={geometria[0]}
        zoom={17}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AjustarMapa puntos={puntos} />

        <Polyline
          positions={geometria}
          pathOptions={{ color: '#1769aa', weight: 6, opacity: 0.85 }}
        />

        {inicio && (
          <CircleMarker
            center={inicio}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#16834a',
              fillOpacity: 1,
            }}
          >
            <Popup>Salida: {salida.nombre}</Popup>
          </CircleMarker>
        )}

        {destino && (
          <CircleMarker
            center={destino}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#d94841',
              fillOpacity: 1,
            }}
          >
            <Popup>
              Zona segura: {zonaSeguraNombre ?? 'Destino de evacuación'}
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      <div className="cs-mapa-leyenda">
        <span><i className="cs-mapa-punto salida" /> Salida</span>
        <span><i className="cs-mapa-punto destino" /> Zona segura</span>
        <span><i className="cs-mapa-linea" /> Recorrido peatonal</span>
      </div>
    </section>
  );
}
