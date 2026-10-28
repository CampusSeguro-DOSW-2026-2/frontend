import { useState } from 'react';
import { PageHeader } from '../components/Layout';
import { StateChip } from '../components/Chips';
import { changeUsersStatus, errorMessage } from '../services/users';
import { STATE_LABEL } from '../utils/labels';
import type { Session, StatusChange, UserSummary } from '../types';
import '../users.css';

interface Props {
  session: Session;
  selected: UserSummary[];
  onSelectedChange: (users: UserSummary[]) => void;
}

export default function ChangeStatus({ session, selected, onSelectedChange }: Props) {
  const [target, setTarget] = useState('INACTIVO');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<StatusChange[] | null>(null);

  // El back no permite que un administrador cambie su propio estado
  const includesMe = selected.some((u) => u.id === session.user.id);

  const remove = (id: string) => {
    onSelectedChange(selected.filter((u) => u.id !== id));
    setError('');
  };

  const apply = async () => {
    if (submitting || selected.length === 0 || includesMe) return;

    setSubmitting(true);
    setError('');
    try {
      const results = await changeUsersStatus(session, selected.map((u) => u.id), target);
      const next = new Map<string, string>(results.map((r): [string, string] => [r.id, r.next]));
      onSelectedChange(selected.map((u) => ({ ...u, state: next.get(u.id) ?? u.state })));
      setDone(results);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const backToList = () => {
    onSelectedChange([]);
    window.location.hash = '#/usuarios';
  };

  const changed = done ? done.filter((r) => r.previous !== r.next).length : 0;
  const unchanged = done ? done.length - changed : 0;

  return (
    <>
      <PageHeader
        badge="ADMINISTRADOR"
        title="Editar estado"
        subtitle="Elige el nuevo estado y aplícalo a los usuarios seleccionados."
      />
      <main className="content narrow">
        {selected.length === 0 && !done ? (
          <section className="panel">
            <p className="notice" role="status">No hay usuarios seleccionados. Vuelve al listado y marca los que quieras modificar.</p>
            <a className="btn white" href="#/usuarios">Volver al listado</a>
          </section>
        ) : (
          <section className="panel" aria-busy={submitting}>
            {done ? (
              <>
                <p className="notice" role="status">
                  {changed} {changed === 1 ? 'usuario pasó' : 'usuarios pasaron'} a {STATE_LABEL[target] ?? target}.
                  {unchanged > 0 && ` ${unchanged} ya ${unchanged === 1 ? 'estaba' : 'estaban'} en ese estado.`}
                </p>
                <button type="button" className="btn red" onClick={backToList}>Volver al listado</button>
              </>
            ) : (
              <form
                className="statusbar"
                noValidate
                onSubmit={(e) => { e.preventDefault(); void apply(); }}
              >
                <div className="field">
                  <label htmlFor="target">Estado</label>
                  <div className="input">
                    <select id="target" value={target} onChange={(e) => setTarget(e.target.value)}>
                      <option value="ACTIVO">{STATE_LABEL.ACTIVO}</option>
                      <option value="INACTIVO">{STATE_LABEL.INACTIVO}</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn red" disabled={submitting || includesMe}>
                  {submitting ? 'Cambiando…' : 'Cambiar'}
                </button>
              </form>
            )}

            {includesMe && !done && (
              <p className="notice err" role="alert">
                No puedes cambiar tu propio estado. Quita tu usuario de la selección para continuar.
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
                    <th scope="col">Estado</th>
                    {!done && <th scope="col"><span className="sr-only">Acciones</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {selected.map((user) => (
                    <tr key={user.id}>
                      <td className="mail">
                        {user.email}
                        {user.id === session.user.id && <span className="me"> (tú)</span>}
                      </td>
                      <td><StateChip state={user.state} /></td>
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
