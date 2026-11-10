import { useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { enlaceOsm, leerCoordenada } from '../utils/coordenadas';
import '../styles/coordenadas.css';
import 'leaflet/dist/leaflet.css';

// Punto de partida del mapa (el mismo de los ejemplos de los formularios).
const INICIO = { latitud: 4.78271, longitud: -74.04263 };

const numero = (texto: string, eje: 'latitud' | 'longitud') => {
  const valor = leerCoordenada(texto, eje);
  return typeof valor === 'number' ? valor : undefined;
};

// El backend guarda 6 decimales (cerca de 10 cm), no hace falta más precisión.
const redondear = (valor: number) => Number(valor.toFixed(6));

function ClicEnMapa({ alElegir }: { alElegir: (latitud: number, longitud: number) => void }) {
  useMapEvents({ click: (e) => alElegir(redondear(e.latlng.lat), redondear(e.latlng.lng)) });
  return null;
}

/**
 * Ayuda para llenar latitud y longitud. Con `onElegir` muestra un mapa: al hacer clic en el punto exacto
 * las coordenadas se copian solas a los campos del formulario. Sin él (o si prefieres OpenStreetMap)
 * queda el enlace para buscar el punto y copiar los números a mano.
 */
export function AyudaCoordenadas({ latitud, longitud, onElegir }: {
  latitud: string;
  longitud: string;
  onElegir?: (latitud: number, longitud: number) => void;
}) {
  const [verMapa, setVerMapa] = useState(false);
  const [elegida, setElegida] = useState<string | null>(null);
  const lat = numero(latitud, 'latitud');
  const lon = numero(longitud, 'longitud');
  const validas = lat !== undefined && lon !== undefined;
  const centro = validas ? { latitud: lat, longitud: lon } : INICIO;

  const alElegir = (la: number, lo: number) => {
    onElegir?.(la, lo);
    setElegida(`${la}, ${lo}`);
  };

  return (
    <div className="cs-ayuda-coordenadas">
      <div className="cs-ayuda-acciones">
        {onElegir && (
          <button type="button" className="cs-mini" onClick={() => setVerMapa((v) => !v)} aria-expanded={verMapa}>
            {verMapa ? 'Ocultar mapa' : 'Elegir en el mapa'}
          </button>
        )}
        <a className="cs-mini cs-enlace-boton" target="_blank" rel="noopener noreferrer"
          href={`https://www.openstreetmap.org/#map=19/${centro.latitud}/${centro.longitud}`}>
          Buscar en OpenStreetMap
        </a>
        {validas && (
          <a className="cs-enlace" target="_blank" rel="noopener noreferrer" href={enlaceOsm(lat, lon)}>
            Revisar estas coordenadas en el mapa
          </a>
        )}
      </div>

      {onElegir && verMapa && (
        <>
          <MapContainer className="cs-mapa-selector" center={[centro.latitud, centro.longitud]} zoom={18}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClicEnMapa alElegir={alElegir} />
            {validas && (
              <CircleMarker
                center={[lat, lon]}
                radius={9}
                pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#c0392b', fillOpacity: 1 }}
              />
            )}
          </MapContainer>
          <p className="cs-sub" role="status">
            {elegida
              ? `Coordenadas copiadas a los campos: ${elegida}. Haz clic en otro punto para cambiarlas.`
              : 'Haz clic en el punto exacto y las coordenadas se copian solas a los campos de latitud y longitud.'}
          </p>
        </>
      )}

      {!(onElegir && verMapa) && (
        <p className="cs-sub">
          {onElegir
            ? 'Usa «Elegir en el mapa» para marcar el punto y copiar las coordenadas automáticamente.'
            : 'En OpenStreetMap, haz clic derecho sobre el punto exacto y elige «Centrar el mapa aquí»: la dirección del navegador queda como …#map=19/latitud/longitud. Copia esos dos números en los campos.'}
        </p>
      )}
    </div>
  );
}
