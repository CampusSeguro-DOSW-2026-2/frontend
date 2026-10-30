import { useState } from 'react';
import { PageHeader } from '../components/Layout';
import { RoleChip } from '../components/Chips';
import { RolePicker } from '../components/RolePicker';
import { changeUserRoles, RolesApiError } from '../services/roles';
import type { RoleField } from '../services/roles';
import { errorMessage } from '../services/users';
import type { RoleChange, RolesDraft, Session, UserSummary } from '../types';
import '../users.css';

interface Props {
  session: Session;
  selected: UserSummary[];
  onSelectedChange: (users: UserSummary[]) => void;
}

// Resultado del cambio: los usuarios tal como estaban y los roles con los que quedaron
interface Done { before: UserSummary[]; results: RoleChange[] }

const EMPTY: RolesDraft = { add: [], remove: [] };

// Mensajes globales de F-09; el back sigue siendo quien decide (también valida y responde 400)
function validate(d: RolesDraft): string {
  if (d.add.length === 0 && d.remove.length === 0) {
    return 'Indique roles a agregar o retirar.';
  }
  if (d.add.some((role) => d.remove.includes(role))) {
    return 'Un rol no puede agregarse y retirarse a la vez.';
  }
  return '';
}

const sameRoles = (a: string[], b: string[]) => [...a].sort().join(',') === [...b].sort().join(',');

function Roles({ roles }: { roles: string[] }) {
  return <div className="chips">{roles.map((role) => <RoleChip key={role} role={role} />)}</div>;
}

/** Formulario F-09 (solo administrador): agrega y retira roles a los usuarios seleccionados. */
export default function ChangeRoles({ session, selected, onSelectedChange }: Props) {
  const [draft, setDraft] = useState<RolesDraft>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Partial<Record<RoleField, string>>>({});
  const [done, setDone] = useState<Done | null>(null);

  // El back no permite que un administrador cambie sus propios roles
  const includesMe = selected.some((u) => u.id === session.user.id);

  const edit = (next: RolesDraft) => {
    setDraft(next);
    setError('');
    setFields({});
  };

  const remove = (id: string) => {
    onSelectedChange(selected.filter((u) => u.id !== id));
    setError('');
    setFields({});
  };

  const apply = async () => {
    if (submitting || selected.length === 0 || includesMe) return;

    const problem = validate(draft);
    if (problem) {
      setError(problem);
      setFields({});
      return;
    }

    setSubmitting(true);
    setError('');
    setFields({});
    try {
      const results = await changeUserRoles(session, selected.map((u) => u.id), draft);
      const next = new Map<string, string[]>(results.map((r): [string, string[]] => [r.id, r.roles]));
      setDone({ before: selected, results });
      onSelectedChange(selected.map((u) => ({ ...u, roles: next.get(u.id) ?? u.roles })));
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof RolesApiError) {
        setFields(err.roleFields);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const backToList = () => {
    onSelectedChange([]);
    window.location.hash = '#/roles';
  };

  const finalRoles = new Map<string, string[]>((done?.results ?? []).map((r): [string, string[]] => [r.id, r.roles]));
  const changed = done ? done.before.filter((u) => !sameRoles(u.roles, finalRoles.get(u.id) ?? u.roles)).length : 0;
  const unchanged = done ? done.before.length - changed : 0;

  return (
    <>
      <PageHeader
        badge="ADMINISTRADOR"
        title="Editar roles"
        subtitle="Elige los roles a agregar o retirar y aplícalos a los usuarios seleccionados."
      />
      <main className="content narrow">
        {selected.length === 0 && !done ? (
          <section className="panel">
            <p className="notice" role="status">No hay usuarios seleccionados. Vuelve al listado y marca los que quieras modificar.</p>
            <a className="btn white" href="#/roles">Volver al listado</a>
          </section>
        ) : (
          <section className="panel" aria-busy={submitting}>
            {done ? (
              <>
                <p className="notice" role="status">
                  {changed > 0
                    ? `${changed} ${changed === 1 ? 'usuario cambió' : 'usuarios cambiaron'} sus roles.`
                    : 'Ningún usuario cambió: ya tenían ese resultado.'}
                  {changed > 0 && unchanged > 0 && ` ${unchanged} ya ${unchanged === 1 ? 'tenía' : 'tenían'} ese resultado.`}
                  {' '}Los nuevos roles se reflejan en el siguiente inicio de sesión de cada usuario.
                </p>
                <button type="button" className="btn red" onClick={backToList}>Volver al listado</button>
              </>
            ) : (
              <form
                className="rolesform"
                noValidate
                onSubmit={(e) => { e.preventDefault(); void apply(); }}
              >
                <div className="pickers">
                  <RolePicker
                    id="add"
                    label="Roles a agregar"
                    help="Opcional. Se suman a los que ya tiene cada usuario."
                    value={draft.add}
                    onChange={(add) => edit({ ...draft, add })}
                    error={fields.add}
                    disabled={submitting}
                  />
                  <RolePicker
                    id="remove"
                    label="Roles a retirar"
                    help="Opcional. Cada usuario debe conservar al menos un rol."
                    value={draft.remove}
                    onChange={(next) => edit({ ...draft, remove: next })}
                    error={fields.remove}
                    disabled={submitting}
                  />
                </div>
                <button type="submit" className="btn red rolesbar" disabled={submitting || includesMe}>
                  {submitting ? 'Aplicando…' : 'Aplicar cambios'}
                </button>
              </form>
            )}

            {includesMe && !done && (
              <p className="notice err" role="alert">
                No puedes modificar tus propios roles. Quita tu usuario de la selección para continuar.
              </p>
            )}
            {error && <p className="notice err" role="alert">{error}</p>}

            <h2>Lista de usuarios seleccionados</h2>
            <div className="tablewrap">
              <table className="utable">
                <caption className="sr-only">Usuarios seleccionados</caption>
                <thead>
                  <tr>
                    <th scope="col">Correo</th>
                    <th scope="col">{done ? 'Roles anteriores' : 'Roles actuales'}</th>
                    {done && <th scope="col">Roles actuales</th>}
                    {!done && <th scope="col"><span className="sr-only">Acciones</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {(done ? done.before : selected).map((user) => (
                    <tr key={user.id}>
                      <td className="mail">
                        {user.email}
                        {user.id === session.user.id && <span className="me"> (tú)</span>}
                      </td>
                      <td><Roles roles={user.roles} /></td>
                      {done && <td><Roles roles={finalRoles.get(user.id) ?? user.roles} /></td>}
                      {!done && (
                        <td className="right">
                          <button type="button" className="linkbtn" onClick={() => remove(user.id)} aria-label={`Quitar a ${user.email} de la selección`}>
                            Quitar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
