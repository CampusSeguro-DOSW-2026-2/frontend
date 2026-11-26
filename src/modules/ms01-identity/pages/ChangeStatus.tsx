import { Mensaje } from '../../../shared/components/Mensaje';
import { useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { StateChip } from '../components/Chips';
import { changeUsersStatus, errorMessage } from '../services/users';
import { STATE_LABEL } from '../utils/labels';
import type { Session } from '../../../shared/types';
import type { StatusChange, UserSummary } from '../types';
import '../styles/users.css';

interface Props {
  session: Session;
  selected: UserSummary[];
  onSelectedChange: (users: UserSummary[]) => void;
}

const STATES = ['ACTIVO', 'INACTIVO'];

/**
 * Cambiar el estado de los usuarios seleccionados (F-08, RF-MS01-07): cada usuario tiene su propio estado, así que en
 * una sola pantalla se activan unos e inactivan otros. Solo se envían los que cambian, en una petición por estado
 * (el contrato aplica un estado por petición). El back no permite cambiar el propio estado, así que esa fila queda fija.
 */
export default function ChangeStatus({ session, selected, onSelectedChange }: Props) {
  // Estado elegido para cada usuario; si no está, conserva el actual
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<StatusChange[] | null>(null);

  const isMe = (user: UserSummary) => user.id === session.user.id;
  const targetOf = (user: UserSummary) => targets[user.id] ?? user.state;
  const changes = selected.filter((u) => !isMe(u) && targetOf(u) !== u.state);

  const setTarget = (id: string, state: string) => {
    setTargets((current) => ({ ...current, [id]: state }));
    setError('');
  };

  // Atajo: el mismo estado para todos los seleccionados (salvo el propio)
  const setAll = (state: string) => {
    setTargets(Object.fromEntries(selected.filter((u) => !isMe(u)).map((u) => [u.id, state])));
    setError('');
  };

  const remove = (id: string) => {
    onSelectedChange(selected.filter((u) => u.id !== id));
    setError('');
  };

  const apply = async () => {
    if (submitting || changes.length === 0) return;

    setSubmitting(true);
    setError('');
    const results: StatusChange[] = [];
    try {
      for (const state of STATES) {
        const ids = changes.filter((u) => targetOf(u) === state).map((u) => u.id);
        if (ids.length > 0) {
          results.push(...await changeUsersStatus(session, ids, state));
        }
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }

    // Lo que alcanzó a aplicarse se refleja aunque una de las peticiones haya fallado
    if (results.length > 0) {
      const next = new Map<string, string>(results.map((r): [string, string] => [r.id, r.next]));
      onSelectedChange(selected.map((u) => ({ ...u, state: next.get(u.id) ?? u.state })));
      setTargets({});
      setDone(results);
    }
  };

  const backToList = () => {
    onSelectedChange([]);
    window.location.hash = '#/usuarios';
  };

  const doneById = new Map<string, StatusChange>((done ?? []).map((r): [string, StatusChange] => [r.id, r]));
  const activated = (done ?? []).filter((r) => r.next === 'ACTIVO' && r.previous !== r.next).length;
  const deactivated = (done ?? []).filter((r) => r.next === 'INACTIVO' && r.previous !== r.next).length;

  return (
    <>
      <PageHeader volver={{ href: '#/usuarios', texto: 'Usuarios' }}
        badge="ADMINISTRACIÓN"
        title="Cambiar estado"
        subtitle="Elija el estado de cada usuario seleccionado y aplique todos los cambios a la vez."
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
                  {activated > 0 && `${activated} ${activated === 1 ? 'usuario pasó' : 'usuarios pasaron'} a Activo. `}
                  {deactivated > 0 && `${deactivated} ${deactivated === 1 ? 'usuario pasó' : 'usuarios pasaron'} a Inactivo. `}
                  {deactivated > 0 && 'Su sesión se cerró.'}
                </Mensaje>
                <button type="button" className="btn red" onClick={backToList}>Volver al listado</button>
              </>
            ) : (
              <div className="selbar">
                <span>Todos a:</span>
                {STATES.map((state) => (
                  <button key={state} type="button" className="btn white" disabled={submitting} onClick={() => setAll(state)}>
                    {STATE_LABEL[state] ?? state}
                  </button>
                ))}
              </div>
            )}

            {error && <Mensaje tono="error">{error}</Mensaje>}

            <h2>Usuarios seleccionados</h2>
            <div className="tablewrap">
              <table className="utable">
                <caption className="sr-only">Usuarios seleccionados y su estado</caption>
                <thead>
                  <tr>
                    <th scope="col">Correo</th>
                    <th scope="col">{done ? 'Estado anterior' : 'Estado actual'}</th>
                    <th scope="col">{done ? 'Estado actual' : 'Nuevo estado'}</th>
                    {!done && <th scope="col"><span className="sr-only">Acciones</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {selected.map((user) => {
                    const result = doneById.get(user.id);
                    const target = targetOf(user);
                    const changing = !isMe(user) && target !== user.state;
                    return (
                      <tr key={user.id} className={changing ? 'changed' : undefined}>
                        <td className="mail">
                          {user.email}
                          {isMe(user) && <span className="me"> (usted)</span>}
                        </td>
                        <td><StateChip state={result ? result.previous : user.state} /></td>
                        <td>
                          {done && <StateChip state={result ? result.next : user.state} />}
                          {!done && isMe(user) && <span className="hint">No puede cambiar su propio estado.</span>}
                          {!done && !isMe(user) && (
                            <div className="pills" role="group" aria-label={`Nuevo estado de ${user.email}`}>
                              {STATES.map((state) => (
                                <button key={state} type="button" className="pill" aria-pressed={target === state}
                                  disabled={submitting} onClick={() => setTarget(user.id, state)}>
                                  {STATE_LABEL[state] ?? state}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        {!done && (
                          <td className="right">
                            <button type="button" className="linkbtn" onClick={() => remove(user.id)} aria-label={`Quitar a ${user.email} de la selección`}>
                              Quitar
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!done && (
              <div className="actions">
                <button type="button" className="btn red" disabled={submitting || changes.length === 0} onClick={() => void apply()}>
                  {submitting ? 'Aplicando…' : `Aplicar ${changes.length} ${changes.length === 1 ? 'cambio' : 'cambios'}`}
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
