import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { PermissionPicker } from '../components/PermissionPicker';
import { TextField } from '../components/TextField';
import { ApiError, errorMessage } from '../../../shared/services/http';
import { createRole, getPermissionCatalog, updateRole, updateRolePermissions } from '../services/roles';
import { roleLabel } from '../utils/labels';
import { MANDATORY_PERMISSIONS, permissionRulesFor } from '../utils/permissions';
import { roleDescriptionError, roleNameError } from '../utils/validation';
import type { PermissionItem, RoleDetail, RoleDraft } from '../types';
import type { Session } from '../../../shared/types';
import '../styles/users.css';

type Errors = Partial<Record<keyof RoleDraft, string>>;

// Orden visual de los campos: sirve para enfocar el primero con error
const FIELD_ORDER: (keyof RoleDraft)[] = ['name', 'description', 'permissions'];

// Mismas reglas y mensajes que el back (F-10 y F-11): el back sigue siendo quien decide
function validate(d: RoleDraft): Errors {
  const e: Errors = {};
  const name = roleNameError(d.name);
  if (name) e.name = name;
  const description = roleDescriptionError(d.description);
  if (description) e.description = description;
  return e;
}

const focusField = (errs: Errors) => {
  const first = FIELD_ORDER.find((k) => errs[k]);
  if (first) document.getElementById(first)?.focus();
  return !!first;
};

const sameList = (a: string[], b: string[]) => [...a].sort().join(',') === [...b].sort().join(',');

interface Props {
  session: Session;
  /** Crear un rol (F-10) o editar el elegido en la lista de roles (F-11 y F-12). */
  mode: 'create' | 'edit';
  /** Rol que se edita; null si no se eligió ninguno. */
  role: RoleDetail | null;
}

/**
 * Crear un rol (F-10) o editarlo (RF-MS01-10) en una sola pantalla: nombre, descripción y permisos. Al editar se
 * guarda primero el nombre y la descripción (F-11) y después los permisos (F-12), solo lo que cambió. Los permisos
 * obligatorios no se pueden quitar y ms01:role:manage es solo de ADMIN.
 */
export default function RoleForm({ session, mode, role }: Props) {
  const creating = mode === 'create';
  // Rol tal como está guardado: cambia si el nombre se guardó pero los permisos no
  const [saved, setSaved] = useState<RoleDetail | null>(role);
  const [form, setForm] = useState<RoleDraft>({
    name: role?.role ?? '', description: role?.description ?? '', permissions: role?.permissions ?? [],
  });
  const [catalog, setCatalog] = useState<PermissionItem[] | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPermissionCatalog(session)
      .then((items) => {
        if (!cancelled) {
          setCatalogError('');
          setCatalog(items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setCatalogError(errorMessage(err));
      });
    return () => { cancelled = true; };
  }, [session, attempt]);

  const set = <K extends keyof RoleDraft>(k: K, v: RoleDraft[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
    setServerError('');
  };

  // Un rol nuevo se trata como cualquier rol que no es ADMIN
  const { locked, forbidden } = permissionRulesFor(saved?.role ?? '');
  const finalPermissions = [...new Set([...locked, ...form.permissions])].filter((c) => !forbidden.includes(c)).sort();
  const infoChanged = saved !== null
    && (form.name.trim().toUpperCase() !== saved.role || form.description.trim() !== saved.description);
  const permissionsChanged = saved !== null && !sameList(finalPermissions, saved.permissions);

  const submit = async () => {
    if (submitting) return;
    const e = validate(form);
    setErrors(e);
    if (focusField(e)) return;

    setSubmitting(true);
    setServerError('');
    try {
      if (saved === null) {
        await createRole(session, form);
      } else {
        let current = saved;
        if (infoChanged) {
          current = await updateRole(session, saved.role, form);
          setSaved(current);
        }
        if (permissionsChanged) {
          await updateRolePermissions(session, current.role, finalPermissions);
        }
      }
      window.location.hash = '#/roles';
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (!focusField(err.fields)) setServerError(err.message);
      } else {
        setServerError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!creating && !role) {
    return (
      <>
        <PageHeader badge="ADMINISTRACIÓN" title="Editar rol" subtitle="Cambie el nombre, la descripción o los permisos del rol." />
        <main className="content narrow">
          <section className="panel">
            <p className="notice" role="status">No hay un rol elegido. Vuelva a la lista de roles y elija uno.</p>
            <a className="btn white" href="#/roles">Volver a los roles</a>
          </section>
        </main>
      </>
    );
  }

  const nothingChanged = !creating && !infoChanged && !permissionsChanged;

  return (
    <>
      <PageHeader
        badge="ADMINISTRACIÓN"
        title={creating ? 'Crear rol' : 'Editar rol'}
        subtitle={creating
          ? 'Defina el nombre, la descripción y los permisos del rol nuevo.'
          : 'Cambie el nombre, la descripción o los permisos del rol.'}
      />
      <main className="content narrow">
        <form className="panel role-panel" noValidate aria-busy={submitting}
          onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="role-fields">
            <TextField id="name" label="Nombre del rol" placeholder="Ingrese el nombre, por ejemplo MONITOR_EVACUACION"
              value={form.name} onChange={(v) => set('name', v)} error={errors.name} maxLength={30}
              hint={saved?.system
                ? 'Los roles de sistema no se pueden renombrar.'
                : `Se guarda en mayúsculas y se muestra como «${roleLabel(form.name.trim().toUpperCase() || 'MONITOR_EVACUACION')}».`} />
            <TextField id="description" label="Descripción" placeholder="Ingrese qué hace el rol"
              value={form.description} onChange={(v) => set('description', v)} error={errors.description}
              maxLength={200} multiline hint={`${form.description.length} de 200 caracteres`} />
          </div>

          {catalogError && (
            <>
              <p className="notice err" role="alert">{catalogError}</p>
              <button type="button" className="btn white rolesbar" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button>
            </>
          )}
          {!catalogError && !catalog && <p className="notice" role="status">Cargando los permisos…</p>}
          {catalog && (
            <PermissionPicker id="permissions" catalog={catalog} value={form.permissions}
              onChange={(permissions) => set('permissions', permissions)}
              baseline={saved?.permissions ?? MANDATORY_PERMISSIONS}
              locked={locked} forbidden={forbidden} error={errors.permissions} disabled={submitting} />
          )}

          {!creating && ((infoChanged && form.name.trim().toUpperCase() !== saved?.role) || permissionsChanged) && (
            <p className="notice" role="status">Se cerrará la sesión de los usuarios que tienen este rol.</p>
          )}
          {serverError && <p className="notice err" role="alert">{serverError}</p>}

          <div className="actions">
            <button type="submit" className="btn red" disabled={submitting || !catalog || nothingChanged}>
              {submitting ? 'Guardando…' : creating ? 'Crear rol' : 'Guardar cambios'}
            </button>
            <a className="btn white" href="#/roles">Cancelar</a>
          </div>
        </form>
      </main>
    </>
  );
}
