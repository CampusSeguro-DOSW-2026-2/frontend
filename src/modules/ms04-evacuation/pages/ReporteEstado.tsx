import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { ApiError, errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { campusApi } from '../services/campus';
import { checkinApi } from '../services/checkin';
import type { Checkin, CheckinRequest, EstadoCheckin, Evento, PuntoEncuentro } from '../types';
import { ESTADOS, fechaHora, textoEstado, tipoEvento } from '../utils/labels';
import '../styles/checkin.css';

/** Mensaje de éxito del reporte (F-01). */
export const ESTADO_REGISTRADO = 'Su estado quedó registrado.';

type Puntos =
  | { estado: 'sin-cargar' }
  | { estado: 'cargando' }
  | { estado: 'listo'; puntos: PuntoEncuentro[] }
  | { estado: 'error'; mensaje: string };

/**
 * F-01 Reporte de estado (RF-MS04-02). Las cuatro opciones se ven siempre. Elegir Me estoy evacuando o No estoy en
 * el campus envía el reporte; Estoy a salvo muestra los puntos de encuentro de MS02 y elegir uno lo envía. Así el
 * reporte se completa en máximo 3 interacciones desde el menú (RNF-MS04-07). Requiero asistencia se habilita con su
 * ubicación en RF-MS04-04.
 */
export default function ReporteEstado({ session, eventoId }: { session: Session; eventoId: string }) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [elegido, setElegido] = useState<EstadoCheckin | null>(null);
  const [puntos, setPuntos] = useState<Puntos>({ estado: 'sin-cargar' });
  const [enviando, setEnviando] = useState(false);
  const [registrado, setRegistrado] = useState<Checkin | null>(null);
  const [error, setError] = useState('');
  const [errorCampo, setErrorCampo] = useState('');

  // El nombre del evento sale de los eventos activos del usuario; si no está ahí, MS04 dirá por qué al reportar
  useEffect(() => {
    let vigente = true;
    checkinApi.eventosActivos(session)
      .then((eventos) => { if (vigente) setEvento(eventos.find((e) => e.evento_id === eventoId) ?? null); })
      .catch(() => { /* el encabezado queda genérico */ });
    return () => { vigente = false; };
  }, [session, eventoId]);

  const cargarPuntos = () => {
    setPuntos({ estado: 'cargando' });
    campusApi.puntosEncuentro(session)
      .then((lista) => setPuntos({ estado: 'listo', puntos: lista }))
      .catch((err: unknown) => setPuntos({ estado: 'error', mensaje: errorMessage(err) }));
  };

  const enviar = async (cuerpo: CheckinRequest) => {
    setEnviando(true);
    setError('');
    setErrorCampo('');
    setRegistrado(null);
    try {
      setRegistrado(await checkinApi.reportar(session, eventoId, cuerpo));
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setErrorCampo(err.fields.punto ?? err.fields.estado ?? '');
    } finally {
      setEnviando(false);
    }
  };

  const elegir = (estado: EstadoCheckin) => {
    setElegido(estado);
    if (estado === 'SAFE') {
      setError('');
      setRegistrado(null);
      if (puntos.estado === 'sin-cargar' || puntos.estado === 'error') cargarPuntos();
      return;
    }
    void enviar({ estado });
  };

  const nombrePunto = (id: string | null) =>
    (puntos.estado === 'listo' ? puntos.puntos.find((p) => p.id === id)?.nombre : undefined);

  return (
    <>
      <PageHeader
        badge={evento ? tipoEvento(evento.simulacro).toUpperCase() : 'CHECK-IN'}
        title={evento?.nombre ?? 'Reportar mi estado'}
        subtitle="¿Cómo estás? Elige una opción"
      />
      <main className="content">
        <section aria-labelledby="chk-estado-titulo">
          <h2 id="chk-estado-titulo" className="title sm22">Mi estado</h2>
          <div className="chk-opciones" role="group" aria-label="Estado" style={{ marginTop: 16 }}>
            {ESTADOS.map(({ codigo, texto }) => {
              const pendiente = codigo === 'NEEDS_ASSISTANCE';
              return (
                <button key={codigo} type="button" className="chk-opcion" aria-pressed={elegido === codigo}
                  disabled={enviando || pendiente} onClick={() => elegir(codigo)}>
                  {texto}
                  {pendiente && <small>Disponible pronto</small>}
                </button>
              );
            })}
          </div>
        </section>

        {elegido === 'SAFE' && (
          <section className="chk-puntos" aria-labelledby="chk-punto-titulo">
            <h2 id="chk-punto-titulo" className="title sm22">¿En qué punto de encuentro estás?</h2>
            {puntos.estado === 'cargando' && <p className="notice" role="status">Consultando los puntos de encuentro…</p>}
            {puntos.estado === 'error' && (
              <>
                <p className="notice err" role="alert">{puntos.mensaje}</p>
                <button type="button" className="btn white chk-retry" onClick={cargarPuntos}>Intentar de nuevo</button>
              </>
            )}
            {puntos.estado === 'listo' && puntos.puntos.length === 0 && (
              <p className="notice" role="status">No hay puntos de encuentro disponibles.</p>
            )}
            {puntos.estado === 'listo' && puntos.puntos.length > 0 && (
              <ul aria-label="Puntos de encuentro">
                {puntos.puntos.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="chk-punto" disabled={enviando}
                      aria-pressed={registrado?.punto_encuentro_id === p.id}
                      onClick={() => void enviar({ estado: 'SAFE', punto_encuentro_id: p.id })}>
                      {p.nombre}
                      <small>{[p.codigo, p.ubicacion].filter(Boolean).join(' · ')}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errorCampo && <p className="error" role="alert">{errorCampo}</p>}
          </section>
        )}

        {enviando && <p className="notice" role="status">Enviando su estado…</p>}
        {error && !errorCampo && <p className="notice err" role="alert">{error}</p>}
        {registrado && (
          <p className="notice chk-ok" role="status">
            {ESTADO_REGISTRADO} {textoEstado(registrado.estado)}
            {registrado.estado === 'SAFE' && nombrePunto(registrado.punto_encuentro_id)
              ? ` en ${nombrePunto(registrado.punto_encuentro_id)}` : ''}
            {registrado.fecha_hora ? ` (${fechaHora(registrado.fecha_hora)}).` : '.'}
          </p>
        )}
      </main>
    </>
  );
}
