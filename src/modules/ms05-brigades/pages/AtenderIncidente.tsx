import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { useCallback, useEffect, useRef, useState } from 'react';
import { withoutIds } from '../../../shared/utils/text';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { ApiError, errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { formatDate, scopeLabelIn } from '../../ms06-drills/utils/labels';
import { brigadesApi } from '../services/brigades';
import type { EvidenciaDetalle, IncidenteDetalle } from '../types';
import { estadoIncidente } from '../utils/incidentes';
import PrioridadChip from '../components/PrioridadChip';
import '../styles/respuesta.css';

type Resultado = 'TRANSFERIDO' | 'RESUELTO' | 'NO_RESUELTO';

/** Resultados que MS05 registra al finalizar la atención (POST /resolver). */
const RESULTADOS: { codigo: Resultado; titulo: string; texto: string; icono: string }[] = [
  { codigo: 'TRANSFERIDO', titulo: 'Transferido', texto: 'La atención pasó a otro responsable.', icono: '⇄' },
  { codigo: 'RESUELTO', titulo: 'Resuelto', texto: 'La situación fue atendida y solucionada.', icono: '✓' },
  { codigo: 'NO_RESUELTO', titulo: 'No resuelto', texto: 'No fue posible completar la atención.', icono: '✕' },
];

const tituloResultado = (codigo: string) => RESULTADOS.find((r) => r.codigo === codigo)?.titulo ?? codigo;

const PinIcon = () => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
);
const FileIcon = () => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
);

interface Props { session: Session; eventoId: string; incidenteId: string }

/**
 * Atender incidente (mockup "Atender incidente"): el brigadista responsable revisa el caso y registra el resultado.
 * Si el incidente sigue ASIGNADO puede iniciar la atención aquí; el caso solo se cierra al pulsar «Finalizar».
 */
export default function AtenderIncidente({ session, eventoId, incidenteId }: Props) {
  const [inc, setInc] = useState<IncidenteDetalle | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [errorObs, setErrorObs] = useState('');
  const [busy, setBusy] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [errorEvidencia, setErrorEvidencia] = useState('');
  // URLs temporales de las evidencias abiertas; se liberan al salir de la pantalla.
  const blobUrls = useRef<string[]>([]);
  const { catalog } = useScopeCatalog();
  const canAttend = hasPermission(session, PERMISSION.MS05_ASSISTANCE_UPDATE_STATUS);

  useEffect(() => () => {
    blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const load = useCallback(() => {
    setError('');
    brigadesApi.detalle(session, eventoId, incidenteId)
      .then(setInc)
      .catch((err) => setError(errorMessage(err)));
  }, [session, eventoId, incidenteId]);

  useEffect(() => { load(); }, [load]);

  const propio = inc?.brigadistaResponsableId === session.user.id;
  const enAtencion = inc?.estado === 'EN_ATENCION';
  const puedeFinalizar = canAttend && propio && enAtencion && !finalizado;

  const iniciar = async () => {
    setBusy(true);
    setNotice('');
    try {
      await brigadesApi.iniciarAtencion(session, eventoId, incidenteId);
      load();
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const finalizar = async () => {
    if (!resultado) { setErrorObs('Seleccione el resultado de la atención.'); return; }
    if (!observaciones.trim()) { setErrorObs('Escriba las observaciones de la atención.'); return; }
    setErrorObs('');
    setBusy(true);
    setNotice('');
    try {
      await brigadesApi.resolver(session, eventoId, incidenteId, observaciones.trim(), resultado);
      setFinalizado(true);
      load();
    } catch (err) {
      setNotice(errorMessage(err));
      if (err instanceof ApiError && err.fields.observaciones) setErrorObs(err.fields.observaciones);
    } finally {
      setBusy(false);
    }
  };

  const abrirEvidencia = async (evidencia: EvidenciaDetalle) => {
    if (!evidencia.id) return;
    // Se abre la pestaña antes del fetch para que el navegador no la bloquee como emergente.
    const ventana = window.open('', '_blank');
    setAbriendo(evidencia.id);
    setErrorEvidencia('');
    try {
      const url = await brigadesApi.abrirEvidencia(session, eventoId, incidenteId, evidencia.id);
      blobUrls.current.push(url);
      if (ventana) ventana.location.href = url;
      else window.open(url, '_blank', 'noopener');
    } catch (err) {
      ventana?.close();
      setErrorEvidencia(errorMessage(err));
    } finally {
      setAbriendo(null);
    }
  };

  const st = inc ? estadoIncidente(inc.estado) : null;
  // Título del caso para la persona: la descripción (sin ids técnicos), nunca el id del incidente
  const descripcion = inc?.descripcion ? withoutIds(inc.descripcion) : '';
  const titulo = descripcion ? (descripcion.length > 60 ? `${descripcion.slice(0, 60)}…` : descripcion) : 'Incidente sin descripción';

  return (
    <>
      <PageHeader badge="BRIGADISTA" title="Atender incidente" subtitle="Revise la información del caso y registre el resultado de la atención." context="Respuesta oficial" />
      <main className="rs-main">
        <a className="rs-back" href="#/brigadista">← Volver al panel brigadista</a>
        {error && <Mensaje tono="error" onReintentar={load}>{error}</Mensaje>}
        {!inc && !error && <Cargando texto="Cargando incidente…" />}

        {inc && st && (
          <div className="rs-grid rs-atender">
            <section className="rs-card rs-caso" aria-labelledby="rs-caso-titulo">
              <div className="rs-inc-top">
                <PrioridadChip codigo={inc.prioridad} />
                <span className={`rs-st ${st.clase}`}>{st.texto}</span>
              </div>
              <h2 id="rs-caso-titulo" className="rs-caso-titulo">{titulo}</h2>
              <div className="rs-place">
                <PinIcon />
                <div>
                  <b>{scopeLabelIn(inc.ubicacionId, catalog)}</b>
                  <small>Reportado {formatDate(inc.fechaReporte)}</small>
                </div>
              </div>
              <div className="rs-kv">
                <small>Persona afectada</small>
                <span className="rs-person">{inc.nombreAfectado || 'Sin nombre registrado'}</span>
              </div>
              {descripcion.length > 60 && (
                <div className="rs-sec">
                  <h3>Descripción completa</h3>
                  <p className="rs-sub">{descripcion}</p>
                </div>
              )}
              {(inc.resultadoAtencion || inc.observacionesResolucion) && (
                <div className="rs-sec">
                  <h3>Resolución</h3>
                  {inc.resultadoAtencion && <p className="rs-sub"><b>Resultado:</b> {tituloResultado(inc.resultadoAtencion)}</p>}
                  {inc.observacionesResolucion && (
                    <p className="rs-sub">{inc.observacionesResolucion}{inc.fechaResolucion && ` · ${formatDate(inc.fechaResolucion)}`}</p>
                  )}
                </div>
              )}
            </section>

            <aside className="rs-side">
              <form className="rs-card" noValidate onSubmit={(e) => { e.preventDefault(); void finalizar(); }}>
                <h2>Resultado de la atención</h2>

                {propio && inc.estado === 'ASIGNADO' && canAttend && (
                  <>
                    <p className="rs-sub">La atención aún no ha iniciado. Iníciela cuando llegue al lugar.</p>
                    <button type="button" className="btn red rs-btn" disabled={busy} aria-busy={busy || undefined} onClick={() => void iniciar()}>{busy ? 'Iniciando…' : 'Iniciar atención'}</button>
                  </>
                )}

                {puedeFinalizar && (
                  <>
                    <p className="rs-sub">Seleccione el resultado. El caso no se cierra hasta que pulse «Finalizar atención».</p>
                    <fieldset className="rs-final" style={{ border: 0, padding: 0, margin: 0 }}>
                      <legend className="rs-sub" style={{ padding: 0, marginBottom: 6 }}>Resultado</legend>
                      {RESULTADOS.map((r) => (
                        <label key={r.codigo}>
                          <input type="radio" name="resultado" value={r.codigo} checked={resultado === r.codigo} onChange={() => setResultado(r.codigo)} />
                          <span><b>{r.titulo}</b><small>{r.texto}</small></span>
                          <span className="rs-final-ico" aria-hidden="true">{r.icono}</span>
                        </label>
                      ))}
                    </fieldset>
                  </>
                )}

                {puedeFinalizar && (
                  <div className="rs-sec">
                    <label htmlFor="obs" className="rs-sub"><b>Observaciones</b> (obligatorio)</label>
                    <div className="input area"><textarea id="obs" rows={3} maxLength={1000} value={observaciones}
                      aria-invalid={errorObs ? true : undefined} aria-describedby={errorObs ? 'obs-error' : undefined}
                      onChange={(e) => setObservaciones(e.target.value)} /></div>
                    {errorObs && <span className="error" id="obs-error" role="alert">{errorObs}</span>}
                  </div>
                )}

                {!resultado && puedeFinalizar && <span className="rs-sub">Seleccione una opción para continuar.</span>}
                {!propio && <span className="rs-sub">Solo el brigadista asignado puede registrar el resultado.</span>}
                {propio && !enAtencion && inc.estado !== 'ASIGNADO' && !finalizado && <span className="rs-sub">El incidente está {st.texto.toLowerCase()}.</span>}
                {notice && <Mensaje tono="error">{notice}</Mensaje>}
                {finalizado && <Mensaje tono="exito">Resultado registrado: {resultado ? tituloResultado(resultado) : 'Resuelto'}.</Mensaje>}

                {puedeFinalizar && (
                  <button type="submit" className={`btn rs-btn ${resultado ? 'red' : 'off'}`} disabled={!resultado || busy} aria-busy={busy || undefined}>
                    {busy ? 'Finalizando…' : 'Finalizar atención'}
                  </button>
                )}
              </form>
              <Mensaje tono="info" compacto>Volver al panel no finaliza el incidente. El caso permanece en atención mientras no registre un resultado.</Mensaje>
            </aside>

            <section className="rs-card rs-evid">
              <h2>Evidencia</h2>
              {inc.evidencias.length === 0 && (
                <div className="rs-file">
                  <span className="rs-file-ico"><FileIcon /></span>
                  <span><b>No se adjuntó evidencia</b><small>El reporte no incluye archivos ni fotografías.</small></span>
                </div>
              )}
              {inc.evidencias.map((e) => (
                <button key={e.id ?? e.nombreArchivo} type="button" className="rs-file"
                  onClick={() => void abrirEvidencia(e)} disabled={!e.id || abriendo === e.id}
                  aria-label={`Ver la evidencia ${e.nombreArchivo}`}>
                  <span className="rs-file-ico"><FileIcon /></span>
                  <span>
                    <b>{e.nombreArchivo}</b>
                    <small>{[e.tipoContenido, e.fechaCarga && formatDate(e.fechaCarga), abriendo === e.id ? 'Abriendo…' : 'Toque para ver'].filter(Boolean).join(' · ')}</small>
                  </span>
                </button>
              ))}
              {errorEvidencia && <Mensaje tono="error">{errorEvidencia}</Mensaje>}
            </section>
          </div>
        )}
      </main>
    </>
  );
}
