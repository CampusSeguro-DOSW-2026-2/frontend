import type { EdificioEvento } from '../types';

/**
 * Mapa básico del campus (Escuela Colombiana de Ingeniería) dibujado a partir de Google Maps. Cada edificio del
 * evento aparece como un botón sobre su posición aproximada. Los edificios cuyo nombre no se reconoce se muestran
 * debajo del mapa como botones, para que ninguno quede por fuera.
 *
 * Para ajustar una posición basta con cambiar POSICIONES (coordenadas del viewBox 1000 × 560).
 */
const POSICIONES: Record<string, { x: number; y: number; corto: string }> = {
  A: { x: 640, y: 255, corto: 'A' },
  B: { x: 745, y: 320, corto: 'B' },
  C: { x: 560, y: 345, corto: 'C' },
  D: { x: 655, y: 395, corto: 'D' },
  E: { x: 270, y: 240, corto: 'E' },
  F: { x: 585, y: 175, corto: 'F' },
  G: { x: 745, y: 195, corto: 'G' },
  H: { x: 330, y: 495, corto: 'H' },
  I: { x: 440, y: 480, corto: 'I' },
  L: { x: 380, y: 160, corto: 'L' },
  COLISEO: { x: 80, y: 265, corto: 'Coliseo' },
  BIBLIOTECA: { x: 470, y: 300, corto: 'Biblio.' },
  AULA: { x: 830, y: 430, corto: 'Aula Máx.' },
  HACIENDA: { x: 215, y: 70, corto: 'Hacienda' },
};

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/** Clave de POSICIONES a partir del nombre del edificio ("Edificio A", "Bloque B", "Coliseo El Otoño"…). */
function claveEdificio(nombre: string): string | null {
  const n = sinTildes(nombre).trim();
  if (n.includes('COLISEO')) return 'COLISEO';
  if (n.includes('BIBLIOTECA')) return 'BIBLIOTECA';
  if (n.includes('AULA MAXIMA')) return 'AULA';
  if (n.includes('HACIENDA')) return 'HACIENDA';
  const letra = n.match(/(?:EDIFICIO|BLOQUE|EDIF\.?)\s+([A-Z])\b/) ?? n.match(/^([A-Z])$/);
  if (letra && POSICIONES[letra[1]]) return letra[1];
  return null;
}

interface Props {
  edificios: EdificioEvento[];
  miUbicacionId: string | null;
  deshabilitado: boolean;
  onElegir: (edificio: EdificioEvento) => void;
}

export default function MapaCampus({ edificios, miUbicacionId, deshabilitado, onElegir }: Props) {
  const ubicados = edificios.map((e) => ({ e, clave: claveEdificio(e.nombre) }));
  const enMapa = ubicados.filter((u) => u.clave !== null);
  const fuera = ubicados.filter((u) => u.clave === null).map((u) => u.e);

  const clase = (e: EdificioEvento) => [
    'aa-pin',
    e.ubicacionId === miUbicacionId ? 'mine' : '',
    e.brigadistasAsignados === 0 ? 'empty' : '',
    deshabilitado ? 'off' : '',
  ].filter(Boolean).join(' ');

  const conteo = (n: number) => (n === 1 ? '1 brigadista' : `${n} brigadistas`);

  return (
    <div className="aa-map">
      <svg viewBox="0 0 1000 560" role="group" aria-label="Mapa del campus con los edificios del evento">
        {/* Terreno, vías y lago */}
        <rect x="0" y="0" width="1000" height="560" rx="12" fill="#E3F4E5" />
        <path d="M0 0H1000V48L430 62 0 40Z" fill="#C7EBD0" />
        <path d="M420 60 L990 120" stroke="#B9C3CF" strokeWidth="16" strokeLinecap="round" fill="none" />
        <path d="M955 0 L905 560" stroke="#B9C3CF" strokeWidth="20" fill="none" />
        <path d="M0 445 L300 470 Q360 470 400 455 L900 530" stroke="#B9C3CF" strokeWidth="16" fill="none" strokeLinecap="round" />
        <path d="M505 255 Q590 320 650 380 L720 395 L880 345" stroke="#C9D1DB" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M120 120 L105 420" stroke="#D3DAE2" strokeWidth="6" fill="none" />
        <path d="M400 255 Q395 300 430 330 Q460 345 470 320 Q480 290 455 270 Q430 248 400 255Z" fill="#9ED8F0" />
        <rect x="790" y="180" width="95" height="150" rx="8" fill="#F1F5F9" stroke="#CBD5E1" strokeDasharray="4 3" />
        <text x="837" y="260" textAnchor="middle" fontSize="13" fill="#64748B">P</text>
        <text x="175" y="330" fontSize="13" fill="#15803D">Campo de fútbol</text>
        <text x="610" y="85" fontSize="13" fill="#64748B" transform="rotate(6 610 85)">Calle 207</text>
        <text x="925" y="300" fontSize="13" fill="#64748B" transform="rotate(-84 925 300)">Vía Bogotá - Tunja</text>

        {enMapa.map(({ e, clave }) => {
          const p = POSICIONES[clave as string];
          const ancho = Math.max(86, p.corto.length * 14 + 28);
          return (
            <g key={e.ubicacionId} className={clase(e)} transform={`translate(${p.x} ${p.y})`}
              role="button" tabIndex={0} aria-disabled={deshabilitado}
              aria-label={`${e.nombre}: ${conteo(e.brigadistasAsignados)}${e.ubicacionId === miUbicacionId ? ', su edificio' : ''}`}
              onClick={() => onElegir(e)}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onElegir(e); } }}>
              <title>{e.nombre} · {conteo(e.brigadistasAsignados)}</title>
              <rect x={-ancho / 2} y={-32} width={ancho} height={64} rx={14} />
              <text textAnchor="middle" y={-2}>{p.corto}</text>
              <text className="aa-count" textAnchor="middle" y={20}>{e.brigadistasAsignados} brig.</text>
            </g>
          );
        })}
      </svg>

      <div className="aa-legend" aria-hidden="true">
        <span><i />Edificio del evento</span>
        <span><i className="l-mine" />Su edificio</span>
        <span><i className="l-empty" />Sin brigadistas</span>
      </div>

      {fuera.length > 0 && (
        <>
          <p className="help" style={{ marginTop: 12 }}>Otros edificios del evento:</p>
          <div className="aa-extra">
            {fuera.map((e) => (
              <button key={e.ubicacionId} type="button" className="pill" aria-pressed={e.ubicacionId === miUbicacionId}
                disabled={deshabilitado} onClick={() => onElegir(e)}>
                {e.nombre} · {conteo(e.brigadistasAsignados)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
