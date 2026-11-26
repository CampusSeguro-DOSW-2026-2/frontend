import { Mensaje } from '../../../shared/components/Mensaje';
import { Cargando } from '../../../shared/components/Cargando';
import { useCallback, useEffect, useState } from 'react';
import { withoutIds } from '../../../shared/utils/text';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { ApiError, errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { formatDate, scopeLabelIn } from '../../ms06-drills/utils/labels';
import { brigadesApi } from '../services/brigades';
import type { IncidenteDetalle } from '../types';
import { estadoIncidente } from '../utils/incidentes';
import PrioridadChip from '../components/PrioridadChip';
import '../styles/respuesta.css';

type Resultado = 'TRANSFERIDO' | 'RESUELTO' | 'NO_SE_PUDO';

/**
 * Resultados del mockup. MS05 solo registra «Resuelto» (POST /resolver, con observaciones obligatorias); «Transferido»
 * y «No se pudo» se muestran deshabilitados hasta que MS05 los admita en su contrato.
 */
const RESULTADOS: { codigo: Resultado; titulo: string; texto: string; icono: string; disponible: boolean }[] = [
  { codigo: 'TRANSFERIDO', titulo: 'Transferido', texto: 'La atención pasó a otro responsable.', icono: '⇄', disponible: false },
  { codigo: 'RESUELTO', titulo: 'Resuelto', texto: 'La situación fue atendida y solucionada.', icono: '✓', disponible: true },
  { codigo: 'NO_SE_PUDO', titulo: 'No se pudo', texto: 'No fue posible completar la atención.', icono: '✕', disponible: false },
];

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
  const { catalog } = useScopeCatalog();
  const canAttend = hasPermission(session, PERMISSION.MS05_ASSISTANCE_UPDATE_STATUS);

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
    if (resultado !== 'RESUELTO') return;
    if (!observaciones.trim()) { setErrorObs('Describa cómo se resolvió el incidente.'); return; }
    setErrorObs('');
    setBusy(true);
    setNotice('');
    try {
      await brigadesApi.resolver(session, eventoId, incidenteId, observaciones.trim());
      setFinalizado(true);
      load();
    } catch (err) {
      setNotice(errorMessage(err));
      if (err instanceof ApiError && err.fields.observaciones) setErrorObs(err.fields.observaciones);
    } finally {
      setBusy(false);
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
          <div className="rs-grid">
            <div className="rs-col">
              <section className="rs-card">
                <div className="rs-inc-top">
                  <b>{titulo}</b>
                  <span className={`rs-st ${st.clase}`}>{st.texto}</span>
                </div>
                <div className="rs-kv">
                  <small>Persona afectada</small>
                  <span className="rs-person">{inc.nombreAfectado || 'Sin nombre registrado'}</span>
                </div>
                <PrioridadChip codigo={inc.prioridad} />
                <div className="rs-place">
                  <PinIcon />
                  <div>
                    <b>{scopeLabelIn(inc.ubicacionId, catalog)}</b>
                    <small>Reportado {formatDate(inc.fechaReporte)}</small>
                  </div>
                </div>
                <div className="rs-sec">
                  <h3>Descripción</h3>
                  <p className="rs-sub">{descripcion || 'El reporte no incluye descripción.'}</p>
                </div>
                {inc.observacionesResolucion && (
                  <div className="rs-sec">
                    <h3>Resolución</h3>
                    <p className="rs-sub">{inc.observacionesResolucion}{inc.fechaResolucion && ` · ${formatDate(inc.fechaResolucion)}`}</p>
                  </div>
                )}
              </section>
              <section className="rs-card">
                <h2>Evidencia</h2>
                {inc.evidencias.length === 0 && (
                  <div className="rs-file">
                    <span className="rs-file-ico"><FileIcon /></span>
                    <span><b>No se adjuntó evidencia</b><small>El reporte no incluye archivos ni fotografías.</small></span>
                  </div>
                )}
                {inc.evidencias.map((e) => (
                  <div key={e.id ?? e.nombreArchivo} className="rs-file">
                    <span className="rs-file-ico"><FileIcon /></span>
                    <span><b>{e.nombreArchivo}</b><small>{[e.tipoContenido, e.fechaCarga && formatDate(e.fechaCarga)].filter(Boolean).join(' · ')}</small></span>
                  </div>
                ))}
              </section>
            </div>

            <aside className="rs-side">
              <form className="rs-card" noValidate onSubmit={(e) => { e.preventDefault(); void finalizar(); }}>
                <h2>Estado final</h2>
                <p className="rs-sub">Seleccione el resultado de la atención. El caso no se cerrará hasta que pulse «Finalizar».</p>

                {propio && inc.estado === 'ASIGNADO' && canAttend && (
                  <>
                    <Mensaje tono="info">La atención aún no ha iniciado.</Mensaje>
                    <button type="button" className="btn red rs-btn" disabled={busy} onClick={() => void iniciar()}>{busy ? 'Iniciando…' : 'Iniciar atención'}</button>
                  </>
                )}

                <fieldset className="rs-final" disabled={!puedeFinalizar} style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="rs-sub" style={{ padding: 0, marginBottom: 6 }}>Resultado</legend>
                  {RESULTADOS.map((r) => (
                    <label key={r.codigo} title={r.disponible ? undefined : 'Esta opción todavía no está disponible.'}>
                      <input type="radio" name="resultado" value={r.codigo} checked={resultado === r.codigo}
                        disabled={!r.disponible} onChange={() => setResultado(r.codigo)} />
                      <span><b>{r.titulo}</b><small>{r.disponible ? r.texto : `${r.texto} (aún no disponible)`}</small></span>
                      <span className="rs-final-ico" aria-hidden="true">{r.icono}</span>
                    </label>
                  ))}
                </fieldset>

                {resultado === 'RESUELTO' && puedeFinalizar && (
                  <div className="rs-sec">
                    <label htmlFor="obs" className="rs-sub"><b>¿Cómo se resolvió?</b> (obligatorio)</label>
                    <div className="input area"><textarea id="obs" rows={3} maxLength={1000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></div>
                    {errorObs && <span className="error" role="alert">{errorObs}</span>}
                  </div>
                )}

                {!resultado && puedeFinalizar && <span className="rs-sub">Seleccione una opción para continuar.</span>}
                {!propio && <span className="rs-sub">Solo el brigadista asignado puede registrar el resultado.</span>}
                {propio && !enAtencion && inc.estado !== 'ASIGNADO' && !finalizado && <span className="rs-sub">El incidente está {st.texto.toLowerCase()}.</span>}
                {notice && <Mensaje tono="error">{notice}</Mensaje>}
                {finalizado && <Mensaje tono="exito">Incidente marcado como resuelto.</Mensaje>}

                <button type="submit" className={`btn rs-btn ${puedeFinalizar && resultado ? 'red' : 'off'}`} disabled={!puedeFinalizar || !resultado || busy}>
                  {busy && enAtencion ? 'Finalizando…' : 'Finalizar atención'}
                </button>
              </form>
              <Mensaje tono="info" compacto>Volver al panel no finaliza el incidente. El caso permanece en atención mientras no registre un resultado.</Mensaje>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
