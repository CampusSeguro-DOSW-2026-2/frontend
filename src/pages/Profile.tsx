import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { RoleChip, StateChip } from '../components/Chips';
import { errorMessage, getMyProfile } from '../services/users';
import type { ProfileData, Session } from '../types';
import '../users.css';

const fullName = (p: ProfileData) =>
  [p.firstName, p.secondName, p.firstLastName, p.secondLastName].filter(Boolean).join(' ');

export default function Profile({ session }: { session: Session }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getMyProfile(session)
      .then((p) => {
        if (!cancelled) {
          setError('');
          setProfile(p);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => { cancelled = true; };
  }, [session, attempt]);

  return (
    <>
      <PageHeader
        badge="MI PERFIL"
        title={profile ? fullName(profile) : 'Mi perfil'}
        subtitle={profile ? profile.email : 'Consulta tu información básica en CampusSeguro.'}
      />
      <main className="content narrow">
        {error && (
          <section className="panel">
            <p className="notice err" role="alert">{error}</p>
            <button type="button" className="btn white" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button>
          </section>
        )}

        {!error && !profile && <p className="notice" role="status">Cargando tu perfil…</p>}

        {profile && (
          <section className="panel" aria-label="Mi perfil">
            <div className="profile-row">
              <StateChip state={profile.state} />
              <div className="chips">
                {profile.roles.map((role) => <RoleChip key={role} role={role} />)}
              </div>
            </div>

            <dl className="facts">
              <div><dt>Primer nombre</dt><dd>{profile.firstName}</dd></div>
              <div><dt>Segundo nombre</dt><dd>{profile.secondName || '—'}</dd></div>
              <div><dt>Primer apellido</dt><dd>{profile.firstLastName}</dd></div>
              <div><dt>Segundo apellido</dt><dd>{profile.secondLastName || '—'}</dd></div>
              <div className="wide"><dt>Correo institucional</dt><dd>{profile.email}</dd></div>
            </dl>

            <a className="btn red" href="#/perfil/editar">Editar perfil</a>
          </section>
        )}
      </main>
    </>
  );
}
