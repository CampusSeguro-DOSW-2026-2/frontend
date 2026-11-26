import { Mensaje } from '../../../shared/components/Mensaje';
import { Fragment, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { RoleChip } from '../components/Chips';
import { RoleChecklist } from '../components/RoleChecklist';
import { useRoleOptions } from '../hooks/useRoleOptions';
import { changeUserRoles, RolesApiError } from '../services/roles';
import type { RoleField } from '../services/roles';
import { errorMessage } from '../services/users';
import type { RoleChange, RolesDraft, UserSummary } from '../types';
import type { Session } from '../../../shared/types';
import '../styles/users.css';

interface Props {
  session: Session;
  selected: UserSummary[];
  onSelectedChange: (users: UserSummary[]) => void;
}

// Resultado del cambio: los usuarios tal como estaban y los roles con los que quedaron
interface Done { before: UserSummary[]; results: RoleChange[] }

const EMPTY: RolesDraft = { add: [], remove: [] };

// Tope de roles por usuario (RN-MS01-40)
const MAX_ROLES_PER_USER = 50;

/** Roles con los que quedaría un usuario después de un cambio: se suman los agregados y se restan los retirados. */
function rolesAfter(roles: string[], d: RolesDraft): string[] {
  return [...new Set([...roles, ...d.add])].filter((role) => !d.remove.includes(role)).sort();
}

const sameRoles = (a: string[], b: string[]) => [...a].sort().join(',') === [...b].sort().join(',');

function Roles({ roles }: { roles: string[] }) {
  return <div className="chips">{roles.map((role) => <RoleChip key={role} role={role} />)}</div>;
}

/** Roles con los que quedará el usuario: los nuevos con +, los retirados con −; si no queda ninguno, se avisa. */
function Preview({ before, after }: { before: string[]; after: string[] }) {
  if (after.length === 0) {
    return <span className="error">Quedaría sin roles</span>;
  }
  const removed = before.filter((role) => !after.includes(role));
  return (
    <div className="chips">
      {after.map((role) => (
        <span key={role} className={before.includes(role) ? undefined : 'chip-new'}><RoleChip role={role} /></span>
      ))}
      {removed.map((role) => <span key={role} className="chip-removed"><RoleChip role={role} /></span>)}
    </div>
  );
}

/**
 * Formulario F-09: agrega y retira roles a los usuarios seleccionados. La lista general aplica el mismo cambio a todos
 * y "Editar" ajusta los roles de un usuario en particular, sin volver al listado. Antes de aplicar se ve con qué roles
 * queda cada uno. El back aplica el mismo agregar/retirar a todos los usuarios de una petición, así que se envía una
 * petición por cada combinación distinta de cambios. El back no permite cambiar los propios roles: esa fila queda fija.
 */
export default function ChangeRoles({ session, selected, onSelectedChange }: Props) {
  const roleOptions = useRoleOptions(session);
  // Cambio para todos (lista general) y ajustes de cada usuario, que se aplican después del general
  const [draft, setDraft] = useState<RolesDraft>(EMPTY);
  const [perUser, setPerUser] = useState<Record<string, RolesDraft>>({});
  const [editing, setEditing] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Partial<Record<RoleField, string>>>({});
  const [done, setDone] = useState<Done | null>(null);
  // Bloque de roles para todos: abierto al entrar; plegado, deja ver la tabla sin bajar
  const [generalOpen, setGeneralOpen] = useState(true);

  const isMe = (user: UserSummary) => user.id === session.user.id;
  const others = selected.filter((u) => !isMe(u));
  const finalRolesOf = (user: UserSummary) =>
    (isMe(user) ? user.roles : rolesAfter(rolesAfter(user.roles, draft), perUser[user.id] ?? EMPTY));
  const changed = others.filter((u) => !sameRoles(u.roles, finalRolesOf(u)));

  const clearMessages = () => {
    setError('');
    setFields({});
  };

  const editAll = (next: RolesDraft) => {
    setDraft(next);
    clearMessages();
  };

  // Marca o desmarca un rol solo para este usuario, partiendo de los roles que ya le deja el cambio general
  const toggleFor = (user: UserSummary, role: string) => {
    const own = perUser[user.id] ?? EMPTY;
    const has = finalRolesOf(user).includes(role);
    const add = own.add.filter((r) => r !== role);
    const remove = own.remove.filter((r) => r !== role);
    const general = rolesAfter(user.roles, draft).includes(role);
    // Si el cambio general ya deja el rol como se pide, basta con quitar el ajuste propio
    const next = has
      ? { add, remove: general ? [...remove, role] : remove }
      : { add: general ? add : [...add, role], remove };
    setPerUser((current) => ({ ...current, [user.id]: next }));
    clearMessages();
  };

  const remove = (id: string) => {
    onSelectedChange(selected.filter((u) => u.id !== id));
    clearMessages();
  };

  const apply = async () => {
    if (submitting || changed.length === 0) return;

    // Mismas reglas y mensajes que el back (F-09 y RF-MS01-05); el back sigue siendo quien decide
    if (changed.some((u) => finalRolesOf(u).length === 0)) {
      setError('Cada usuario debe conservar al menos un rol.');
      return;
    }
    if (changed.some((u) => finalRolesOf(u).length > MAX_ROLES_PER_USER)) {
      setError(`Un usuario no puede tener más de ${MAX_ROLES_PER_USER} roles.`);
      return;
    }

    // Usuarios agrupados por el mismo cambio: una petición por grupo
    const groups = new Map<string, { change: RolesDraft; ids: string[] }>();
    for (const user of changed) {
      const target = finalRolesOf(user);
      const change = {
        add: target.filter((r) => !user.roles.includes(r)).sort(),
        remove: user.roles.filter((r) => !target.includes(r)).sort(),
      };
      const key = `${change.add.join(',')}|${change.remove.join(',')}`;
      const group = groups.get(key) ?? { change, ids: [] };
      group.ids.push(user.id);
      groups.set(key, group);
    }

    setSubmitting(true);
    clearMessages();
    const results: RoleChange[] = [];
    try {
      for (const { change, ids } of groups.values()) {
        results.push(...await changeUserRoles(session, ids, change));
      }
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof RolesApiError) {
        setFields(err.roleFields);
      }
    } finally {
      setSubmitting(false);
    }

    // Lo que alcanzó a aplicarse se refleja aunque una de las peticiones haya fallado
    if (results.length > 0) {
      const next = new Map<string, string[]>(results.map((r): [string, string[]] => [r.id, r.roles]));
      setDone({ before: selected, results });
      onSelectedChange(selected.map((u) => ({ ...u, roles: next.get(u.id) ?? u.roles })));
      setDraft(EMPTY);
      setPerUser({});
      setEditing('');
    }
  };

  const backToList = () => {
    onSelectedChange([]);
    window.location.hash = '#/usuarios';
  };

  const doneRoles = new Map<string, string[]>((done?.results ?? []).map((r): [string, string[]] => [r.id, r.roles]));
  const changedCount = done ? done.before.filter((u) => !sameRoles(u.roles, doneRoles.get(u.id) ?? u.roles)).length : 0;

  return (
    <>
      <PageHeader volver={{ href: '#/usuarios', texto: 'Usuarios' }}
        badge="ADMINISTRACIÓN"
        title="Editar roles"
        subtitle="Cambie los roles de todos los seleccionados o de cada usuario y revise cómo queda cada uno antes de aplicar."
      />
      <main className="content narrow">
        {selected.length === 0 && !done ? (
          <section className="panel">
            <Mensaje tono="info">No hay usuarios seleccionados. Vuelva al listado y marque los que desea modificar.</Mensaje>
            <a className="btn white" href="#/usuarios">Volver al listado</a>
          </section>
        ) : (
          <section className="panel wide-edit" aria-busy={submitting}>
            {done ? (
              <>
                <Mensaje tono="exito">
                  {changedCount > 0
                    ? `${changedCount} ${changedCount === 1 ? 'usuario cambió' : 'usuarios cambiaron'} sus roles. Su sesión se cerró para aplicarlos.`
                    : 'Ningún usuario cambió: ya tenían ese resultado.'}
                </Mensaje>
                <button type="button" className="btn red" onClick={backToList}>Volver al listado</button>
              </>
            ) : (
              <div className="general-block">
                <div className="general-head">
                  <h2>Para todos los seleccionados</h2>
                  <span className="general-summary" role="status">
                    {draft.add.length === 0 && draft.remove.length === 0
                      ? 'Sin cambios para todos'
                      : [
                        draft.add.length > 0 && `+${draft.add.length} ${draft.add.length === 1 ? 'rol' : 'roles'}`,
                        draft.remove.length > 0 && `−${draft.remove.length} ${draft.remove.length === 1 ? 'rol' : 'roles'}`,
                      ].filter(Boolean).join(' · ')}
                  </span>
                  <button type="button" className="linkbtn" aria-expanded={generalOpen} aria-controls="roles"
                    onClick={() => setGeneralOpen((open) => !open)}>
                    {generalOpen ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {generalOpen && (
                  <RoleChecklist
                    options={roleOptions}
                    users={others}
                    value={draft}
                    onChange={editAll}
                    error={fields.add ?? fields.remove}
                    disabled={submitting}
                  />
                )}
              </div>
            )}

            {error && <Mensaje tono="error">{error}</Mensaje>}

            <h2>{done ? 'Resultado' : 'Usuarios seleccionados'}</h2>
            <div className="tablewrap">
              <table className="utable">
                <caption className="sr-only">Usuarios seleccionados y sus roles</caption>
                <thead>
                  <tr>
                    <th scope="col">Correo</th>
                    <th scope="col">{done ? 'Roles anteriores' : 'Roles actuales'}</th>
                    <th scope="col">{done ? 'Roles actuales' : 'Después del cambio'}</th>
                    {!done && <th scope="col"><span className="sr-only">Acciones</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {(done ? done.before : selected).map((user) => {
                    const after = finalRolesOf(user);
                    const rowChanged = !done && !sameRoles(user.roles, after);
                    const open = editing === user.id;
                    return (
                      <Fragment key={user.id}>
                        <tr className={rowChanged ? 'changed' : undefined}>
                          <td className="mail">
                            {user.email}
                            {isMe(user) && <span className="me"> (usted)</span>}
                          </td>
                          <td><Roles roles={user.roles} /></td>
                          <td>
                            {done && <Roles roles={doneRoles.get(user.id) ?? user.roles} />}
                            {!done && isMe(user) && <span className="hint">No puede modificar sus propios roles.</span>}
                            {!done && !isMe(user) && <Preview before={user.roles} after={after} />}
                          </td>
                          {!done && (
                            <td className="right">
                              <div className="row-links">
                                {!isMe(user) && (
                                  <button type="button" className="linkbtn" aria-expanded={open} disabled={submitting}
                                    onClick={() => setEditing(open ? '' : user.id)}>
                                    {open ? 'Listo' : 'Editar'}
                                  </button>
                                )}
                                <button type="button" className="linkbtn" onClick={() => remove(user.id)}
                                  aria-label={`Quitar a ${user.email} de la selección`}>
                                  Quitar
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                        {!done && open && (
                          <tr className="row-edit">
                            <td colSpan={4}>
                              <div className="pills" role="group" aria-label={`Roles de ${user.email}`}>
                                {roleOptions.map((o) => (
                                  <button key={o.value} type="button" className="pill" disabled={submitting}
                                    aria-pressed={after.includes(o.value)} onClick={() => toggleFor(user, o.value)}>
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                              {perUser[user.id] && (perUser[user.id].add.length > 0 || perUser[user.id].remove.length > 0) && (
                                <button type="button" className="linkbtn" disabled={submitting}
                                  onClick={() => setPerUser((current) => { const next = { ...current }; delete next[user.id]; return next; })}>
                                  Deshacer los cambios de este usuario
                                </button>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!done && (
              <div className="actions">
                <button type="button" className="btn red fit" disabled={submitting || changed.length === 0} onClick={() => void apply()}
                  aria-label={`Aplicar cambios a ${changed.length} ${changed.length === 1 ? 'usuario' : 'usuarios'}`}>
                  {submitting ? 'Aplicando…' : `Aplicar cambios (${changed.length})`}
                </button>
                <a className="btn white" href="#/usuarios">Cancelar</a>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}
