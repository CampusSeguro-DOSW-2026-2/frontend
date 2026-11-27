import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import { MarcadorMapa } from '../../../shared/components/MarcadorMapa';
import { colorToken, opcionesMapa } from '../../../shared/utils/mapa';
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
        {...opcionesMapa()}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AjustarMapa puntos={puntos} />

        <Polyline
          positions={geometria}
          pathOptions={{ color: colorToken('--blue'), weight: 6, opacity: 0.85 }}
        />

        {inicio && (
          <MarcadorMapa centro={inicio} relleno="--ok">
            <Popup>Salida: {salida.nombre}</Popup>
          </MarcadorMapa>
        )}

        {destino && (
          <MarcadorMapa centro={destino} relleno="--red">
            <Popup>
              Zona segura: {zonaSeguraNombre ?? 'Destino de evacuación'}
            </Popup>
          </MarcadorMapa>
        )}
      </MapContainer>

      <p className="mapa-gesto">Use dos dedos para mover o acercar el mapa.</p>
      <ul className="mapa-leyenda" aria-label="Leyenda del mapa">
        <li><i className="cs-mapa-punto salida" aria-hidden="true" /> Salida</li>
        <li><i className="cs-mapa-punto destino" aria-hidden="true" /> Zona segura</li>
        <li><i className="cs-mapa-linea" aria-hidden="true" /> Recorrido peatonal</li>
      </ul>
    </section>
  );
}
