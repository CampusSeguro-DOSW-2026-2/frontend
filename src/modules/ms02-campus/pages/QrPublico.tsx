import { useEffect, useState } from 'react';
import { campus, CampusApiError, comoCampusError as comoError } from '../services/campus';
import type { EspacioPublico, SalidaPublica, ZonaSeguraPublica } from '../types';
import { TIPOS } from '../types';
import '../styles/qr.css';

export type TipoQr = 'espacios' | 'salidas' | 'zonas';

type Resultado =
  | { tipo: 'espacios'; datos: EspacioPublico }
  | { tipo: 'salidas'; datos: SalidaPublica }
  | { tipo: 'zonas'; datos: ZonaSeguraPublica };

const AYUDA = 'Ante cualquier duda, siga las indicaciones del personal de emergencia.';

const enMapa = (latitud: number, longitud: number) =>
  `https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=19/${latitud}/${longitud}`;

const minutos = (segundos?: number) => (segundos ? Math.max(1, Math.round(segundos / 60)) : null);

function leer(tipo: TipoQr, id: string): Promise<Resultado> {
  if (tipo === 'espacios') return campus.publico.espacio(id).then((datos) => ({ tipo, datos }));
  if (tipo === 'salidas') return campus.publico.salida(id).then((datos) => ({ tipo, datos }));
  return campus.publico.zona(id).then((datos) => ({ tipo, datos }));
}

function mensajeDeError(error: CampusApiError) {
  if (error.status === 404 || error.status === 400) return 'Este código QR no corresponde a ningún lugar registrado.';
  return error.message;
}

function Aviso({ texto }: { texto: string }) {
  return <p className="qr-aviso" role="alert">{texto}</p>;
}

function Espacio({ e }: { e: EspacioPublico }) {
  const g = e.guia;
  const tiempo = minutos(g?.duracionSegundos);
  const pasos: string[] = [];
  if (g?.salida) {
    if (g.escaleras.length > 0) pasos.push(`Baje por la ${g.escaleras.join(' o la ')} hasta el piso de salida.`);
    pasos.push(`Salga del edificio por «${g.salida}».`);
    pasos.push(`Camine${g.distanciaMetros ? ` unos ${Math.round(g.distanciaMetros)} m` : ''}${tiempo ? ` (${tiempo} min)` : ''} hasta la zona segura «${g.zonaSegura}».`);
  }

  return (
    <>
      <h1 className="qr-lugar">{e.nombre}</h1>
      <p className="qr-donde">{[TIPOS[e.tipo], e.edificio, e.piso !== undefined ? `Piso ${e.piso}` : null].filter(Boolean).join(' · ')}</p>

      {!e.disponible && e.aviso && <Aviso texto={e.aviso} />}

      {pasos.length > 0 && (
        <section className="qr-tarjeta" aria-labelledby="qr-que-hacer">
          <h2 id="qr-que-hacer">Qué hacer</h2>
          <ol className="qr-pasos">{pasos.map((p) => <li key={p}>{p}</li>)}</ol>
          {g?.salidaLatitud !== undefined && g?.salidaLongitud !== undefined && (
            <a className="qr-boton" href={enMapa(g.salidaLatitud, g.salidaLongitud)} target="_blank" rel="noreferrer">Ver la salida en el mapa</a>
          )}
          {g && g.pasos.length > 0 && (
            <details className="qr-detalle">
              <summary>Recorrido exterior paso a paso</summary>
              <ol>{g.pasos.map((p, i) => <li key={i}>{p.instruccion}{p.distanciaMetros > 0 ? ` · ${Math.round(p.distanciaMetros)} m` : ''}</li>)}</ol>
            </details>
          )}
        </section>
      )}

      {e.disponible && pasos.length === 0 && (
        <section className="qr-tarjeta" aria-labelledby="qr-que-hacer">
          <h2 id="qr-que-hacer">Qué hacer</h2>
          {g?.mensaje && <Aviso texto={g.mensaje} />}
          {e.evacuacion?.tieneRuta ? (
            <>
              {e.evacuacion.recorrido && <p className="qr-texto">{e.evacuacion.recorrido}</p>}
              {e.evacuacion.zonaSegura && <p className="qr-texto">Zona segura: <strong>{e.evacuacion.zonaSegura}</strong>{e.evacuacion.ubicacionZonaSegura ? `, ${e.evacuacion.ubicacionZonaSegura}` : ''}.</p>}
              {e.evacuacion.mensaje && <Aviso texto={e.evacuacion.mensaje} />}
            </>
          ) : (
            !g?.mensaje && <Aviso texto="Este lugar todavía no tiene una ruta de evacuación registrada." />
          )}
        </section>
      )}

      {e.evacuacion && e.evacuacion.recomendaciones.length > 0 && (
        <section className="qr-tarjeta" aria-labelledby="qr-recomendaciones">
          <h2 id="qr-recomendaciones">Recomendaciones</h2>
          <ul className="qr-recomendaciones">
            {e.evacuacion.recomendaciones.map((r) => <li key={r.titulo}><strong>{r.titulo}</strong><span>{r.recomendacion}</span></li>)}
          </ul>
        </section>
      )}
    </>
  );
}

function Salida({ s }: { s: SalidaPublica }) {
  return (
    <>
      <h1 className="qr-lugar">{s.nombre}</h1>
      <p className="qr-donde">{['Salida', s.edificio, s.piso !== undefined ? `Piso ${s.piso}` : null].filter(Boolean).join(' · ')}</p>
      {!s.disponible && s.aviso && <Aviso texto={s.aviso} />}
      <section className="qr-tarjeta">
        <h2>Qué hacer</h2>
        <p className="qr-texto">{s.disponible
          ? 'Salga por aquí y diríjase a la zona segura indicada por el personal de emergencia.'
          : 'No use esta salida. Busque otra salida del edificio.'}</p>
        <a className="qr-boton" href={enMapa(s.latitud, s.longitud)} target="_blank" rel="noreferrer">Ver en el mapa</a>
      </section>
    </>
  );
}

function Zona({ z }: { z: ZonaSeguraPublica }) {
  return (
    <>
      <h1 className="qr-lugar">{z.nombre}</h1>
      <p className="qr-donde">{z.puntoEncuentro ? 'Punto de encuentro' : 'Zona segura'}{z.ubicacion ? ` · ${z.ubicacion}` : ''}</p>
      {!z.disponible && z.aviso && <Aviso texto={z.aviso} />}
      <section className="qr-tarjeta">
        <h2>Qué hacer</h2>
        <p className="qr-texto">{z.disponible
          ? 'Permanezca aquí y espere las indicaciones del personal de emergencia.'
          : 'Esta zona no está habilitada. Diríjase a otra zona segura.'}</p>
        {z.latitud !== undefined && z.longitud !== undefined && (
          <a className="qr-boton" href={enMapa(z.latitud, z.longitud)} target="_blank" rel="noreferrer">Ver en el mapa</a>
        )}
      </section>
    </>
  );
}

export default function QrPublico({ tipo, id }: { tipo: TipoQr; id: string }) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<CampusApiError | null>(null);

  useEffect(() => {
    let vigente = true;
    leer(tipo, id)
      .then((r) => { if (vigente) setResultado(r); })
      .catch((e) => { if (vigente) setError(comoError(e)); });
    return () => { vigente = false; };
  }, [tipo, id]);

  return (
    <div className="qr-pagina">
      <header className="qr-cabecera">
        <span className="qr-marca">CampusSeguro</span>
        <span className="qr-sello">EVACUACIÓN</span>
      </header>
      <main className="qr-contenido">
        {error && <Aviso texto={mensajeDeError(error)} />}
        {!error && !resultado && <p className="qr-texto" role="status">Cargando…</p>}
        {resultado?.tipo === 'espacios' && <Espacio e={resultado.datos} />}
        {resultado?.tipo === 'salidas' && <Salida s={resultado.datos} />}
        {resultado?.tipo === 'zonas' && <Zona z={resultado.datos} />}
        <p className="qr-ayuda">{AYUDA}</p>
      </main>
    </div>
  );
}
