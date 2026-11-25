import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { USE_MS03, activeAlertApi, type ActiveAlert } from '../../ms03-alerts/services/activeAlert';
import { AccionesEvento } from '../components/AccionesEvento';
import { OtrosEventos } from '../components/OtrosEventos';
import { eventsApi } from '../../ms06-drills/services/events';
import { checkinApi } from '../services/checkin';
import type { Evento } from '../types';
import { fechaHora, textoEstadoEvento, tipoEvento } from '../utils/labels';
import CentroEvento from './CentroEvento';
import '../styles/checkin.css';

/** Cada cuánto se vuelve a consultar si empezó o terminó un evento o una alerta. */
const CONSULTA_MS = 10000;

/** Evento en ejecución para quien lo sigue sin estar convocado (auditor, coordinación): nombre, tipo y a dónde ir. */
interface EnSeguimiento { id: string; nombre: string; simulacro: boolean; inicio: string | null; href: string; accion: string }

interface EnCurso {
  /** Eventos en ejecución que convocan al usuario (MS04), del más reciente al más antiguo. */
  eventos: Evento[];
  /** Eventos en ejecución que el usuario puede seguir aunque no esté convocado (MS06 o el panel de MS04). */
  seguimiento: EnSeguimiento[];
  /** Alerta activa más reciente dirigida al usuario (MS03), o null. */
  alerta: ActiveAlert | null;
}

const fechaDe = (e: Evento) => (e.fecha_inicio ? new Date(e.fecha_inicio).getTime() : 0);

/**
 * Pantalla de inicio: muestra lo que está ocurriendo en este momento y se actualiza sola cada 10 s (y al volver a la
 * pestaña). Con un evento en ejecución es el Centro del evento (nombre, accesos rápidos y check-in); si hay varios,
 * muestra el más reciente y una tarjeta con los demás para cambiar a cualquiera de ellos sin salir de Inicio (si el
 * elegido termina, vuelve al más reciente). Sin evento, la alerta activa de MS03 con los accesos. Sin nada, el aviso
 * de que el campus está seguro y los accesos. Cada fuente se consulta solo con su permiso.
 */
export default function Inicio({ session }: { session: Session }) {
  const [enCurso, setEnCurso] = useState<EnCurso | null>(null);
  const [error, setError] = useState('');
  const [elegidoId, setElegidoId] = useState<string | null>(null);

  const puedeVerEventos = hasPermission(session, PERMISSION.MS04_CHECKIN_READ_OWN);
  const puedeReportar = hasPermission(session, PERMISSION.MS04_CHECKIN_WRITE);
  // Sin MS03 activo (VITE_USE_MS03) el servicio de alertas solo tiene una alerta de demostración: no se muestra
  const puedeVerAlertas = USE_MS03 && hasPermission(session, PERMISSION.MS03_ALERT_RECEIVE);
  // Seguir eventos sin estar convocado: «Ver en vivo» de Eventos (MS06) o, si no, el panel de evacuación (MS04)
  const puedeVerEnVivo = hasPermission(session, PERMISSION.MS06_DRILL_READ, PERMISSION.MS06_REAL_EVENT_READ,
    PERMISSION.MS06_DRILL_MANAGE, PERMISSION.MS06_REAL_EVENT_MANAGE);
  const puedeVerPanel = hasPermission(session, PERMISSION.MS04_DASHBOARD_READ);

  const enSeguimiento = useCallback(async (): Promise<EnSeguimiento[]> => {
    if (puedeVerEnVivo) {
      const pagina = await eventsApi.search(session, { status: 'IN_PROGRESS', size: 20 });
      return pagina.content.map((e) => ({
        id: e.id, nombre: e.name, simulacro: e.simulacro, inicio: e.startedAt ?? e.startDate,
        href: `#/eventos/${encodeURIComponent(e.id)}`, accion: 'Ver en vivo',
      }));
    }
    if (puedeVerPanel) {
      const pagina = await checkinApi.listarEventos(session, { estado: 'EN_EJECUCION', page: 0, size: 20 });
      return pagina.contenido.map((e) => ({
        id: e.evento_id, nombre: e.nombre, simulacro: e.simulacro, inicio: e.fecha_inicio,
        href: `#/evacuacion/eventos/${encodeURIComponent(e.evento_id)}`, accion: 'Ver seguimiento',
      }));
    }
    return [];
  }, [session, puedeVerEnVivo, puedeVerPanel]);

  const consultar = useCallback(async () => {
    const [eventos, alerta, seguimiento] = await Promise.allSettled([
      puedeVerEventos ? checkinApi.eventosActivos(session) : Promise.resolve<Evento[]>([]),
      puedeVerAlertas ? activeAlertApi.getActiveAlert() : Promise.resolve(null),
      enSeguimiento(),
    ]);
    // Si una consulta falla se conserva lo último que se supo de esa fuente
    setEnCurso((previo) => ({
      eventos: eventos.status === 'fulfilled'
        ? [...eventos.value].sort((a, b) => fechaDe(b) - fechaDe(a))
        : previo?.eventos ?? [],
      alerta: alerta.status === 'fulfilled' ? alerta.value : previo?.alerta ?? null,
      seguimiento: seguimiento.status === 'fulfilled' ? seguimiento.value : previo?.seguimiento ?? [],
    }));
    const fallo = [eventos, alerta, seguimiento].find((r): r is PromiseRejectedResult => r.status === 'rejected');
    setError(fallo ? errorMessage(fallo.reason) : '');
  }, [session, puedeVerEventos, puedeVerAlertas, enSeguimiento]);

  useEffect(() => {
    void consultar();
    const refrescar = () => { if (document.visibilityState === 'visible') void consultar(); };
    const timer = window.setInterval(refrescar, CONSULTA_MS);
    document.addEventListener('visibilitychange', refrescar);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refrescar); };
  }, [consultar]);

  const aviso = error
    ? <p className="notice err" role="alert">{error} <button type="button" className="plink" onClick={() => void consultar()}>Reintentar</button></p>
    : null;

  if (!enCurso) {
    return <main className="content"><p className="notice" role="status">Consultando si hay un evento o una alerta en curso…</p></main>;
  }

  // El evento elegido mientras siga en curso; si no, el más reciente
  const evento = enCurso.eventos.find((e) => e.evento_id === elegidoId) ?? enCurso.eventos[0];
  if (evento) {
    const otros = enCurso.eventos.filter((e) => e.evento_id !== evento.evento_id);
    const elegir = (id: string) => {
      setElegidoId(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const avisos = <>{aviso}<OtrosEventos eventos={otros} onElegir={elegir} /></>;
    if (puedeReportar) {
      return (
        <CentroEvento key={evento.evento_id} session={session} eventoId={evento.evento_id} eventoActual={evento}
          aviso={avisos} />
      );
    }
    return (
      <>
        <PageHeader
          badge={`${tipoEvento(evento.simulacro)} · ${textoEstadoEvento(evento.estado)}`.toUpperCase()}
          title={evento.nombre}
          subtitle="Evacuación del campus en curso"
          context={evento.fecha_inicio ? `Iniciado: ${fechaHora(evento.fecha_inicio)}` : undefined}
        />
        <main className="content">{avisos}<AccionesEvento session={session} /></main>
      </>
    );
  }

  // No está convocado, pero sigue los eventos en curso (auditoría, coordinación, organización, brigada)
  if (enCurso.seguimiento.length > 0) {
    const n = enCurso.seguimiento.length;
    return (
      <>
        <PageHeader badge="EVENTOS EN CURSO" title={n === 1 ? 'Hay 1 evento en ejecución' : `Hay ${n} eventos en ejecución`}
          subtitle="Siga el estado de las personas y los incidentes de cada evento." />
        <main className="content">
          {aviso}
          <section className="chk-otros" aria-label="Eventos en ejecución">
            <ul>
              {enCurso.seguimiento.map((e) => (
                <li key={e.id} className="chk-otro">
                  <span className="tag">{tipoEvento(e.simulacro).toUpperCase()}</span>
                  <div className="chk-otro-txt">
                    <b>{e.nombre}</b>
                    {e.inicio && <small>Iniciado: {fechaHora(e.inicio)}</small>}
                  </div>
                  <a className="btn white chk-otro-ir" href={e.href}>{e.accion} →</a>
                </li>
              ))}
            </ul>
          </section>
          <AccionesEvento session={session} />
        </main>
      </>
    );
  }

  const { alerta } = enCurso;
  // «El campus está seguro» solo lo dice quien puede ver eventos o alertas; otro rol ve un inicio neutro
  const puedeSaber = puedeVerEventos || puedeVerAlertas || puedeVerEnVivo || puedeVerPanel;
  return (
    <>
      {alerta
        ? <PageHeader badge="ALERTA · ACTIVA" title={alerta.title} subtitle="Alerta activa en el campus"
            context={`Iniciada: ${fechaHora(alerta.startedAt)}`} />
        : puedeSaber
          ? <PageHeader badge="SIN EVENTOS EN CURSO" title="El campus está seguro" subtitle="No hay eventos ni alertas activas." />
          : <PageHeader badge="INICIO" title="Bienvenido a CampusSeguro" subtitle="Use el menú para ir a las secciones que administra." />}
      <main className="content">{aviso}<AccionesEvento session={session} /></main>
    </>
  );
}
