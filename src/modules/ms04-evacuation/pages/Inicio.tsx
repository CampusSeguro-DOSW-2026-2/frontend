import { useCallback, useEffect, useState } from 'react';
import { Cargando } from '../../../shared/components/Cargando';
import { PageHeader } from '../../../shared/components/Layout';
import { Mensaje } from '../../../shared/components/Mensaje';
import { PERMISSION } from '../../../shared/permissions';
import { errorMessage } from '../../../shared/services/http';
import { hasPermission } from '../../../shared/services/session';
import type { Session } from '../../../shared/types';
import { AlertaActiva } from '../../../shared/components/AlertaActiva';
import { USE_MS03, activeAlertApi, type ActiveAlert } from '../../ms03-alerts/services/activeAlert';
import { OPERATIONAL_TYPE, scopeText } from '../../ms03-alerts/services/catalog';
import { useScopeCatalog } from '../../ms03-alerts/hooks/useScopeCatalog';
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
 * elegido termina, vuelve al más reciente). La alerta activa de MS03 (instrucciones y «Confirmar recepción») va primero
 * en todas las variantes; con un evento, encima del check-in. Sin evento ni alerta, el aviso
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
  // Nombres de edificios y zonas (MS02) para el alcance de la alerta; solo se consultan si se pueden ver alertas
  const { catalog } = useScopeCatalog(puedeVerAlertas);

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
    ? <Mensaje tono="error" onReintentar={() => void consultar()}>{error}</Mensaje>
    : null;

  if (!enCurso) {
    return <main className="content"><Cargando texto="Consultando si hay un evento o una alerta en curso…" /></main>;
  }

  // Alerta activa de MS03 con sus instrucciones y «Confirmar recepción» (confirmAlert de MS03). Va primero en todas las
  // variantes de Inicio; con un evento en curso, encima del check-in
  const { alerta } = enCurso;
  const tarjetaAlerta = (mostrarTitulo: boolean) => alerta && (
    <AlertaActiva key={alerta.id} mostrarTitulo={mostrarTitulo}
      alerta={{
        titulo: alerta.title,
        instrucciones: alerta.instructions,
        alcance: scopeText(alerta.scope, catalog, alerta.scopes),
        iniciada: fechaHora(alerta.startedAt),
        operativa: alerta.types.length === 1 && alerta.types[0] === OPERATIONAL_TYPE,
        confirmada: alerta.confirmed,
      }}
      onConfirmar={async () => {
        await activeAlertApi.confirmAlert(alerta.id);
        setEnCurso((previo) => (previo?.alerta?.id === alerta.id
          ? { ...previo, alerta: { ...previo.alerta, confirmed: true } }
          : previo));
      }} />
  );

  // El evento elegido mientras siga en curso; si no, el más reciente
  const evento = enCurso.eventos.find((e) => e.evento_id === elegidoId) ?? enCurso.eventos[0];
  if (evento) {
    const otros = enCurso.eventos.filter((e) => e.evento_id !== evento.evento_id);
    const elegir = (id: string) => {
      setElegidoId(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    // Los demás eventos en curso van después del check-in y de los accesos: lo primero es reportar el estado
    const otrosEventos = <OtrosEventos eventos={otros} onElegir={elegir} recienteId={enCurso.eventos[0].evento_id} />;
    if (puedeReportar) {
      return (
        <CentroEvento key={evento.evento_id} session={session} eventoId={evento.evento_id} eventoActual={evento}
          alerta={tarjetaAlerta(true)} aviso={aviso} despues={otrosEventos}
          nota={otros.length > 0 && evento.evento_id === enCurso.eventos[0].evento_id ? 'Más reciente' : undefined} />
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
        <main className="content">{tarjetaAlerta(true)}{aviso}<AccionesEvento session={session} />{otrosEventos}</main>
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
          {tarjetaAlerta(true)}
          {aviso}
          <AccionesEvento session={session} />
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
        </main>
      </>
    );
  }

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
      <main className="content">{tarjetaAlerta(false)}{aviso}<AccionesEvento session={session} /></main>
    </>
  );
}
