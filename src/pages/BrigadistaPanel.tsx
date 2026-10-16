import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { Check, MapIcon } from '../components/Icons';
import { api } from '../services/api';
import type { AssistanceRequest, Brigadista } from '../types';

const minutesAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export default function BrigadistaPanel() {
  const [me, setMe] = useState<Brigadista | null>(null);
  const [reqs, setReqs] = useState<AssistanceRequest[]>([]);
  const load = () => api.getRequests().then(setReqs);
  useEffect(() => { api.getBrigadista().then(setMe); load(); }, []);
  const count = (s: AssistanceRequest['status']) => reqs.filter((r) => r.status === s).length;
  const featured = reqs.find((r) => r.priority);
  const done = featured?.status === 'RESUELTA';

  const resolve = async () => {
    if (!featured || done) return;
    if (!window.confirm('¿Marcar este caso como resuelto?')) return;
    await api.resolveRequest(featured.id); load();
  };
  if (!me) return null;

  return (
    <>
      <PageHeader badge={me.status} title={`Brigadista: ${me.name}`} subtitle="Panel de Respuesta Oficial" />
      <main className="content">
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 className="title sm22">Resumen Operativo de Solicitudes</h2>
          <div className="stats">
            <div className="stat"><b style={{ color: 'var(--red)' }}>{count('REPORTADA')}</b><span>Reportadas</span></div>
            <div className="stat"><b style={{ color: 'var(--blue)' }}>{count('ASIGNADA')}</b><span>Asignadas</span></div>
            <div className="stat"><b style={{ color: 'var(--amber)' }}>{count('EN_ATENCION')}</b><span>En Atención</span></div>
          </div>
        </section>
        <div className="assign">
          <aside className="zone"><MapIcon /><div><small>Zona de evacuación asignada</small><p>{me.zone}</p></div></aside>
          {featured && (
            <section className="casecol">
              <h2 className="title sm22">Caso Asignado Prioritario</h2>
              <article className={`case${done ? ' done' : ''}`}>
                <div className="ctop"><span className="tag">{featured.priority}</span><span className="age">Hace {minutesAgo(featured.reportedAt)} minutos</span></div>
                <div><h3>{featured.location}</h3><p className="rep">{featured.reporter}</p></div>
                <div className="cbtn"><button className="btn red" onClick={resolve} disabled={done}><Check />{done ? 'Resuelto' : 'Marcar Resuelto'}</button></div>
              </article>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
