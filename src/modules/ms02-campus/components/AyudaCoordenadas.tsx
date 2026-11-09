import { enlaceOsm, leerCoordenada } from '../utils/coordenadas';
import '../styles/coordenadas.css';

// Punto de partida del mapa (el mismo de los ejemplos de los formularios).
const INICIO = { latitud: 4.78271, longitud: -74.04263 };

const numero = (texto: string, eje: 'latitud' | 'longitud') => {
  const valor = leerCoordenada(texto, eje);
  return typeof valor === 'number' ? valor : undefined;
};

/**
 * Ayuda para llenar latitud y longitud: abre OpenStreetMap para buscar el punto y,
 * si ya hay coordenadas válidas escritas, deja revisarlas marcadas en el mapa.
 */
export function AyudaCoordenadas({ latitud, longitud }: { latitud: string; longitud: string }) {
  const lat = numero(latitud, 'latitud');
  const lon = numero(longitud, 'longitud');
  const validas = lat !== undefined && lon !== undefined;
  const centro = validas ? { latitud: lat, longitud: lon } : INICIO;

  return (
    <div className="cs-ayuda-coordenadas">
      <div className="cs-ayuda-acciones">
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
      <p className="cs-sub">
        En el mapa, haz clic derecho sobre el punto exacto y elige «Centrar el mapa aquí»: la dirección del navegador
        queda como <code>…#map=19/latitud/longitud</code>. Copia esos dos números en los campos.
      </p>
    </div>
  );
}
