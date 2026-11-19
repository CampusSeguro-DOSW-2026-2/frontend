import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PERMISSION } from '../../../shared/permissions';
import { errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { USE_MS03, activeAlertApi, type ActiveAlert } from '../../ms03-alerts/services/activeAlert';
import { AccionesEvento } from '../components/AccionesEvento';
import { OtrosEventos } from '../components/OtrosEventos';
import { checkinApi } from '../services/checkin';
import type { Evento } from '../types';
import { fechaHora, textoEstadoEvento, tipoEvento } from '../utils/labels';
import CentroEvento from './CentroEvento';
import '../styles/checkin.css';

/** Cada cuánto se vuelve a consultar si empezó o terminó un evento o una alerta. */
const CONSULTA_MS = 10000;

interface EnCurso {
  /** Eventos en ejecución que convocan al usuario (MS04), del más reciente al más antiguo. */
  eventos: Evento[];
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

  const consultar = useCallback(async () => {
    const [eventos, alerta] = await Promise.allSettled([
      puedeVerEventos ? checkinApi.eventosActivos(session) : Promise.resolve<Evento[]>([]),
      puedeVerAlertas ? activeAlertApi.getActiveAlert() : Promise.resolve(null),
    ]);
    // Si una consulta falla se conserva lo último que se supo de esa fuente
    setEnCurso((previo) => ({
      eventos: eventos.status === 'fulfilled'
        ? [...eventos.value].sort((a, b) => fechaDe(b) - fechaDe(a))
        : previo?.eventos ?? [],
      alerta: alerta.status === 'fulfilled' ? alerta.value : previo?.alerta ?? null,
    }));
    const fallo = [eventos, alerta].find((r): r is PromiseRejectedResult => r.status === 'rejected');
    setError(fallo ? errorMessage(fallo.reason) : '');
  }, [session, puedeVerEventos, puedeVerAlertas]);

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

  const { alerta } = enCurso;
  return (
    <>
      {alerta
        ? <PageHeader badge="ALERTA · ACTIVA" title={alerta.title} subtitle="Alerta activa en el campus"
            context={`Iniciada: ${fechaHora(alerta.startedAt)}`} />
        : <PageHeader badge="SIN EVENTOS EN CURSO" title="El campus está seguro" subtitle="No hay alertas activas." />}
      <main className="content">{aviso}<AccionesEvento session={session} /></main>
    </>
  );
}
