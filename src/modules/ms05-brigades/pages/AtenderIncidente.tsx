import { useCallback, useEffect, useState } from 'react';
import { Info } from '../../../shared/components/Icons';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { ApiError, errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
import { formatDate, scopeLabelIn } from '../../ms06-drills/utils/labels';
import { brigadesApi } from '../services/brigades';
import type { IncidenteDetalle } from '../types';
import { estadoIncidente, prioridadDe } from '../utils/incidentes';
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
    if (!observaciones.trim()) { setErrorObs('Describe cómo se resolvió el incidente.'); return; }
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

  const p = inc ? prioridadDe(inc.prioridad) : null;
  const st = inc ? estadoIncidente(inc.estado) : null;
  const codigo = `INC-${incidenteId.slice(0, 6).toUpperCase()}`;

  return (
    <>
      <PageHeader badge="BRIGADISTA" title="Atender incidente" subtitle="Revisa la información del caso y registra el resultado de la atención." context="Respuesta oficial" />
      <main className="rs-main">
        <a className="rs-back" href="#/brigadista">← Volver al panel brigadista</a>
        {error && <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={load}>Reintentar</button></p>}
        {!inc && !error && <p className="notice" role="status">Cargando incidente…</p>}

        {inc && p && st && (
          <div className="rs-grid">
            <div className="rs-col">
              <section className="rs-card">
                <div className="rs-inc-top">
                  <b>{codigo}{inc.descripcion ? ` · ${inc.descripcion.length > 40 ? `${inc.descripcion.slice(0, 40)}…` : inc.descripcion}` : ''}</b>
                  <span className={`rs-st ${st.clase}`}>{st.texto}</span>
                </div>
                <div className="rs-kv">
                  <small>Persona afectada</small>
                  <span className="rs-person">{inc.nombreAfectado || 'Sin nombre registrado'}</span>
                </div>
                <span className={`rs-prio ${p.codigo}`}>{p.label}</span>
                <div className="rs-place">
                  <PinIcon />
                  <div>
                    <b>{scopeLabelIn(inc.ubicacionId, catalog)}</b>
                    <small>Reportado {formatDate(inc.fechaReporte)}</small>
                  </div>
                </div>
                <div className="rs-sec">
                  <h3>Descripción</h3>
                  <p className="rs-sub">{inc.descripcion || 'El reporte no incluye descripción.'}</p>
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
                <p className="rs-sub">Selecciona el resultado de la atención. El caso no se cerrará hasta que pulses «Finalizar».</p>

                {propio && inc.estado === 'ASIGNADO' && canAttend && (
                  <>
                    <p className="notice" role="status">La atención aún no ha iniciado.</p>
                    <button type="button" className="btn red rs-btn" disabled={busy} onClick={() => void iniciar()}>{busy ? 'Iniciando…' : 'Iniciar atención'}</button>
                  </>
                )}

                <fieldset className="rs-final" disabled={!puedeFinalizar} style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="rs-sub" style={{ padding: 0, marginBottom: 6 }}>Resultado</legend>
                  {RESULTADOS.map((r) => (
                    <label key={r.codigo} title={r.disponible ? undefined : 'MS05 aún no registra este resultado.'}>
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

                {!resultado && puedeFinalizar && <span className="rs-sub">Selecciona una opción para continuar.</span>}
                {!propio && <span className="rs-sub">Solo el brigadista asignado puede registrar el resultado.</span>}
                {propio && !enAtencion && inc.estado !== 'ASIGNADO' && !finalizado && <span className="rs-sub">El incidente está {st.texto.toLowerCase()}.</span>}
                {notice && <p className="notice err" role="alert">{notice}</p>}
                {finalizado && <p className="notice chk-ok" role="status">Incidente marcado como resuelto.</p>}

                <button type="submit" className={`btn rs-btn ${puedeFinalizar && resultado ? 'red' : 'off'}`} disabled={!puedeFinalizar || !resultado || busy}>
                  {busy && enAtencion ? 'Finalizando…' : 'Finalizar'}
                </button>
              </form>
              <p className="rs-info"><Info /> Volver al panel no finaliza el incidente. El caso permanece en atención mientras no registres un resultado.</p>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
