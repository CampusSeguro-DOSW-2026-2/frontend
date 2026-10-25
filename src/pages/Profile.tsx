import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { RoleChip, StateChip } from '../components/Chips';
import { RoleDetails } from '../components/Permissions';
import { getRoles } from '../services/roles';
import { errorMessage, getMyProfile } from '../services/users';
import { ROLE_LABEL } from '../utils/labels';
import type { ProfileData, RolePermissions, Session } from '../types';
import '../users.css';

const fullName = (p: ProfileData) =>
  [p.firstName, p.secondName, p.firstLastName, p.secondLastName].filter(Boolean).join(' ');

const sameRoles = (a: string[], b: string[]) => [...a].sort().join(',') === [...b].sort().join(',');

export default function Profile({ session }: { session: Session }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [catalog, setCatalog] = useState<RolePermissions[] | null>(null);
  const [rolesError, setRolesError] = useState('');
  const [rolesAttempt, setRolesAttempt] = useState(0);

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

  // Roles y permisos (RF-MS01-05): un usuario recibe solo los suyos; el administrador recibe el catálogo completo
  useEffect(() => {
    let cancelled = false;
    getRoles(session)
      .then((items) => {
        if (!cancelled) {
          setRolesError('');
          setCatalog(items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setRolesError(errorMessage(err));
      });
    return () => { cancelled = true; };
  }, [session, rolesAttempt]);

  // Los permisos que rigen son los de los roles de la sesión (los del token con el que se inició sesión)
  const mine: RolePermissions[] = [];
  for (const role of session.user.roles) {
    const found = catalog?.find((item) => item.role === role);
    if (found) mine.push(found);
  }
  const totalPermissions = new Set(mine.flatMap((item) => item.permissions)).size;
  const permissionWord = totalPermissions === 1 ? 'permiso' : 'permisos';
  const rolesChanged = profile ? !sameRoles(profile.roles, session.user.roles) : false;

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

            <section className="perms" aria-labelledby="perms-title">
              <h2 id="perms-title">Roles y permisos</h2>

              {rolesChanged && (
                <p className="notice" role="status">
                  Tus roles cambiaron (ahora: {profile.roles.map((r) => ROLE_LABEL[r] ?? r).join(', ')}).
                  Inicia sesión de nuevo para que se apliquen a tu sesión.
                </p>
              )}

              {rolesError && (
                <>
                  <p className="notice err" role="alert">{rolesError}</p>
                  <button type="button" className="btn white rolesbar" onClick={() => setRolesAttempt((n) => n + 1)}>Reintentar</button>
                </>
              )}

              {!rolesError && !catalog && <p className="notice" role="status">Cargando tus permisos…</p>}

              {catalog && (
                <>
                  <p className="lead">
                    {mine.length === 1
                      ? `Tu rol concede ${totalPermissions} ${permissionWord}.`
                      : `Tus roles conceden ${totalPermissions} ${permissionWord} en total; se suman los de cada rol.`}
                  </p>
                  <div className="role-list">
                    {mine.map((item) => <RoleDetails key={item.role} item={item} open={mine.length === 1} />)}
                  </div>
                </>
              )}
            </section>

            <a className="btn red" href="#/perfil/editar">Editar perfil</a>
          </section>
        )}
      </main>
    </>
  );
}
