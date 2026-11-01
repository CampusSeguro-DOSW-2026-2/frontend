import { useEffect, useState } from 'react';
import { RoleDetails } from './Permissions';
import { getRoles } from '../services/roles';
import { errorMessage } from '../services/users';
import type { RolePermissions, Session } from '../types';
import '../users.css';

/** Catálogo completo de roles con sus permisos (solo administrador: ms01:role:read_all). */
export function RoleCatalog({ session }: { session: Session }) {
  const [catalog, setCatalog] = useState<RolePermissions[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getRoles(session)
      .then((items) => {
        if (!cancelled) {
          setError('');
          setCatalog(items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => { cancelled = true; };
  }, [session, attempt]);

  return (
    <section className="panel wide-panel perms" aria-labelledby="catalog-title">
      <h2 id="catalog-title">Catálogo de roles y permisos</h2>
      <p className="lead">
        Los roles y los permisos de cada uno los define el sistema y no se pueden editar. Un usuario con varios
        roles tiene la suma de los permisos de cada uno.
      </p>

      {error && (
        <>
          <p className="notice err" role="alert">{error}</p>
          <button type="button" className="btn white rolesbar" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button>
        </>
      )}

      {!error && !catalog && <p className="notice" role="status">Cargando el catálogo…</p>}

      {catalog && (
        <div className="role-list">
          {catalog.map((item) => <RoleDetails key={item.role} item={item} />)}
        </div>
      )}
    </section>
  );
}
