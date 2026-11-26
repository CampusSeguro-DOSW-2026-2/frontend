import { Cargando } from '../../../shared/components/Cargando';
import { Mensaje } from '../../../shared/components/Mensaje';
import { Fragment, useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { RoleChip } from '../components/Chips';
import { PermissionGroups } from '../components/Permissions';
import { deleteRole, getRoleDetails } from '../services/roles';
import { errorMessage } from '../services/users';
import { hasPermission } from '../../../shared/services/session';
import { PERMISSION } from '../utils/permissions';
import type { RoleDetail } from '../types';
import type { Session } from '../../../shared/types';
import '../styles/users.css';

interface Props {
  session: Session;
  /** Guarda el rol que se va a editar (F-11 y F-12). */
  onEditRole: (role: RoleDetail) => void;
  /** Avisa que se borró un rol, para quitarlo de lo que lo mostraba (la selección de usuarios). */
  onRoleDeleted: (role: string) => void;
}

// Aviso de F-13 antes de borrar un rol
const DELETE_WARNING =
  'Los usuarios que tengan solo este rol pasarán a ESTUDIANTE y a los demás se les retirará este rol. Se cerrará su sesión.';

/**
 * Roles (RF-MS01-10): la definición de cada rol, es decir, su nombre, su descripción y sus permisos. Con
 * ms01:role:read_all se consultan y con ms01:role:manage además se crean, editan y borran (F-10 a F-13). ESTUDIANTE y
 * ADMIN son de sistema: no se borran. A quién se le da cada rol se decide en Usuarios (F-09).
 */
export default function Roles({ session, onEditRole, onRoleDeleted }: Props) {
  const canManage = hasPermission(session, PERMISSION.ROLE_MANAGE);
  const [roles, setRoles] = useState<RoleDetail[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState('');
  // Borrado (F-13): rol por confirmar, si se está borrando, su error y el aviso del resultado
  const [confirming, setConfirming] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    getRoleDetails(session)
      .then((items) => {
        if (!cancelled) {
          setError('');
          setRoles(items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => { cancelled = true; };
  }, [session, attempt]);

  const askDelete = (role: string) => {
    setConfirming(role);
    setDeleteError('');
    setNotice('');
  };

  const remove = async (role: string) => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteRole(session, role);
      setConfirming('');
      setNotice(`Se eliminó el rol ${role}.`);
      setRoles((current) => current?.filter((item) => item.role !== role) ?? null);
      setAttempt((n) => n + 1);
      onRoleDeleted(role);
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const columns = canManage ? 4 : 3;

  return (
    <>
      <PageHeader
        badge="ADMINISTRACIÓN"
        title="Roles"
        subtitle={canManage
          ? 'Cree y edite los roles y los permisos que concede cada uno. Los roles se asignan desde Usuarios.'
          : 'Consulte los roles y los permisos que concede cada uno.'}
        context={roles ? `${roles.length} ${roles.length === 1 ? 'rol' : 'roles'}` : undefined}
      />
      <main className="content">
        {canManage && (
          <div className="selbar">
            <a className="btn red" href="#/roles/nuevo">Crear rol</a>
            <span>Cambiar el nombre o los permisos de un rol cierra la sesión de sus usuarios.</span>
          </div>
        )}

        {notice && <Mensaje tono="exito">{notice}</Mensaje>}

        {error && (
          <div className="panel wide-panel">
            <Mensaje tono="error">{error}</Mensaje>
            <button type="button" className="btn white" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button>
          </div>
        )}

        {!error && (
          <div className="tablewrap" aria-busy={!roles}>
            <table className="utable roles-table">
              <caption className="sr-only">Roles y sus permisos</caption>
              <thead>
                <tr>
                  <th scope="col">Rol</th>
                  <th scope="col">Descripción</th>
                  <th scope="col">Permisos</th>
                  {canManage && <th scope="col"><span className="sr-only">Acciones</span></th>}
                </tr>
              </thead>
              <tbody>
                {(roles ?? []).map((item) => {
                  const open = expanded === item.role;
                  const total = item.permissions.length;
                  return (
                    <Fragment key={item.role}>
                      <tr>
                        <td>
                          <div className="chips">
                            <RoleChip role={item.role} />
                            {item.system && <span className="chip">De sistema</span>}
                          </div>
                        </td>
                        <td className="desc">{item.description}</td>
                        <td>
                          <button type="button" className="linkbtn" aria-expanded={open}
                            onClick={() => setExpanded(open ? '' : item.role)}>
                            {total} {total === 1 ? 'permiso' : 'permisos'} · {open ? 'Ocultar' : 'Ver'}
                          </button>
                        </td>
                        {canManage && (
                          <td className="right">
                            <div className="row-actions">
                              <a className="btn white" href="#/roles/editar" onClick={() => onEditRole(item)}>Editar</a>
                              <button type="button" className="btn white" disabled={item.system || deleting}
                                onClick={() => askDelete(item.role)}
                                title={item.system ? 'Los roles de sistema no se pueden eliminar.' : undefined}>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {confirming === item.role && (
                        <tr className="row-detail">
                          <td colSpan={columns}>
                            <div className="role-confirm" role="alertdialog" aria-labelledby={`del-${item.role}`}>
                              <Mensaje id={`del-${item.role}`} tono="aviso">{DELETE_WARNING}</Mensaje>
                              {deleteError && <Mensaje tono="error">{deleteError}</Mensaje>}
                              <div className="btns">
                                <button type="button" className="btn red" disabled={deleting} onClick={() => void remove(item.role)}>
                                  {deleting ? 'Eliminando…' : `Eliminar ${item.role}`}
                                </button>
                                <button type="button" className="btn white" disabled={deleting} onClick={() => setConfirming('')}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {open && (
                        <tr className="row-detail">
                          <td colSpan={columns}><PermissionGroups codes={item.permissions} /></td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!roles && <Cargando texto="Cargando los roles…" />}
          </div>
        )}
      </main>
    </>
  );
}
