import { useState } from 'react';
import { errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { campusApi } from '../services/campus';
import type { Edificio, Espacio, PuntoEncuentro, TipoUbicacion, Ubicacion } from '../types';
import { TIPOS_UBICACION } from '../utils/labels';

type Lista<T> =
  | { estado: 'sin-cargar' }
  | { estado: 'cargando' }
  | { estado: 'listo'; items: T[] }
  | { estado: 'error'; mensaje: string };

interface Lugar {
  id: string;
  nombre: string;
  detalle: string;
}

/**
 * Ubicación de Requiero asistencia (F-01, RN-MS04-09): el usuario elige el tipo de lugar de MS02 (edificio, espacio o
 * punto de encuentro) y luego el lugar; elegir el lugar lo envía. Un espacio se elige dentro de su edificio.
 */
export default function SelectorUbicacion({ session, deshabilitado, seleccionada, onElegir }: {
  session: Session;
  deshabilitado: boolean;
  /** Ubicación del estado vigente, para marcarla */
  seleccionada: Ubicacion | null;
  /** Se llama con la ubicación elegida y su nombre legible */
  onElegir: (ubicacion: Ubicacion, nombre: string) => void;
}) {
  const [tipo, setTipo] = useState<TipoUbicacion | null>(null);
  const [edificios, setEdificios] = useState<Lista<Edificio>>({ estado: 'sin-cargar' });
  const [puntos, setPuntos] = useState<Lista<PuntoEncuentro>>({ estado: 'sin-cargar' });
  const [edificio, setEdificio] = useState<Edificio | null>(null);
  const [espacios, setEspacios] = useState<Lista<Espacio>>({ estado: 'sin-cargar' });

  const cargarEdificios = () => {
    setEdificios({ estado: 'cargando' });
    campusApi.edificios(session)
      .then((items) => setEdificios({ estado: 'listo', items }))
      .catch((err: unknown) => setEdificios({ estado: 'error', mensaje: errorMessage(err) }));
  };

  const cargarPuntos = () => {
    setPuntos({ estado: 'cargando' });
    campusApi.puntosEncuentro(session)
      .then((items) => setPuntos({ estado: 'listo', items }))
      .catch((err: unknown) => setPuntos({ estado: 'error', mensaje: errorMessage(err) }));
  };

  const cargarEspacios = (de: Edificio) => {
    setEspacios({ estado: 'cargando' });
    campusApi.espacios(session, de.id)
      .then((items) => setEspacios({ estado: 'listo', items }))
      .catch((err: unknown) => setEspacios({ estado: 'error', mensaje: errorMessage(err) }));
  };

  const elegirTipo = (nuevo: TipoUbicacion) => {
    setTipo(nuevo);
    setEdificio(null);
    if (nuevo === 'PUNTO_ENCUENTRO') {
      if (puntos.estado === 'sin-cargar' || puntos.estado === 'error') cargarPuntos();
    } else if (edificios.estado === 'sin-cargar' || edificios.estado === 'error') {
      cargarEdificios();
    }
  };

  const elegirEdificio = (de: Edificio) => {
    if (tipo === 'EDIFICIO') {
      onElegir({ tipo: 'EDIFICIO', id: de.id }, de.nombre);
      return;
    }
    setEdificio(de);
    cargarEspacios(de);
  };

  const marcado = (t: TipoUbicacion, id: string) => seleccionada?.tipo === t && seleccionada.id === id;

  /** Lista de lugares con sus estados de carga, error y vacío */
  const lugares = <T,>(lista: Lista<T>, convertir: (item: T) => Lugar, vacio: string, reintentar: () => void,
    etiqueta: string, alElegir: (item: T, lugar: Lugar) => void, tipoMarcado: TipoUbicacion | null) => {
    if (lista.estado === 'cargando') return <p className="notice" role="status">Consultando los lugares…</p>;
    if (lista.estado === 'error') {
      return (
        <>
          <p className="notice err" role="alert">{lista.mensaje}</p>
          <button type="button" className="btn white chk-retry" onClick={reintentar}>Intentar de nuevo</button>
        </>
      );
    }
    if (lista.estado !== 'listo') return null;
    if (lista.items.length === 0) return <p className="notice" role="status">{vacio}</p>;
    return (
      <ul aria-label={etiqueta}>
        {lista.items.map((item) => {
          const lugar = convertir(item);
          return (
            <li key={lugar.id}>
              <button type="button" className="chk-punto" disabled={deshabilitado}
                aria-pressed={tipoMarcado ? marcado(tipoMarcado, lugar.id) : false}
                onClick={() => alElegir(item, lugar)}>
                {lugar.nombre}
                {lugar.detalle && <small>{lugar.detalle}</small>}
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <section className="chk-puntos" aria-labelledby="chk-ubicacion-titulo">
      <h2 id="chk-ubicacion-titulo" className="title sm22">¿Dónde necesita la asistencia?</h2>
      <div className="chk-tipos" role="group" aria-label="Tipo de lugar">
        {TIPOS_UBICACION.map((t) => (
          <button key={t.codigo} type="button" className="chk-punto" aria-pressed={tipo === t.codigo}
            disabled={deshabilitado} onClick={() => elegirTipo(t.codigo)}>
            {t.texto}
            <small>{t.ayuda}</small>
          </button>
        ))}
      </div>

      {tipo === 'PUNTO_ENCUENTRO' && lugares(puntos,
        (p) => ({ id: p.id, nombre: p.nombre, detalle: [p.codigo, p.ubicacion].filter(Boolean).join(' · ') }),
        'No hay puntos de encuentro disponibles.', cargarPuntos, 'Puntos de encuentro',
        (_p, lugar) => onElegir({ tipo: 'PUNTO_ENCUENTRO', id: lugar.id }, lugar.nombre), 'PUNTO_ENCUENTRO')}

      {(tipo === 'EDIFICIO' || (tipo === 'ESPACIO' && !edificio)) && (
        <>
          {tipo === 'ESPACIO' && <p className="help">Primero elija el edificio donde está el espacio.</p>}
          {lugares(edificios, (e) => ({ id: e.id, nombre: e.nombre, detalle: e.descripcion ?? '' }),
            'No hay edificios disponibles.', cargarEdificios, 'Edificios',
            (e) => elegirEdificio(e), tipo === 'EDIFICIO' ? 'EDIFICIO' : null)}
        </>
      )}

      {tipo === 'ESPACIO' && edificio && (
        <>
          <p className="help">
            Espacios de <b>{edificio.nombre}</b>{' '}
            <button type="button" className="chk-link" disabled={deshabilitado} onClick={() => setEdificio(null)}>
              Cambiar edificio
            </button>
          </p>
          {lugares(espacios,
            (s) => ({
              id: s.id,
              nombre: s.nombre,
              detalle: s.pisoNumero !== undefined && s.pisoNumero !== null ? `Piso ${s.pisoNumero}` : '',
            }),
            'Este edificio no tiene espacios disponibles.', () => cargarEspacios(edificio), 'Espacios',
            (_s, lugar) => onElegir({ tipo: 'ESPACIO', id: lugar.id }, `${lugar.nombre} (${edificio.nombre})`),
            'ESPACIO')}
        </>
      )}
    </section>
  );
}
