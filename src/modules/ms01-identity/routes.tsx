import { Mensaje } from '../../shared/components/Mensaje';
import { useState } from 'react';
import type { ReactNode } from 'react';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Users from './pages/Users';
import ChangeStatus from './pages/ChangeStatus';
import Roles from './pages/Roles';
import ChangeRoles from './pages/ChangeRoles';
import RoleForm from './pages/RoleForm';
import { hasPermission } from '../../shared/services/session';
import { PERMISSION } from './utils/permissions';
import type { RoleDetail, UserSummary } from './types';
import type { Session } from '../../shared/types';

// Pantallas públicas: inicio de sesión, registro y recuperación de contraseña. Se muestran a pantalla
// completa, sin la barra de navegación principal. Todas las demás exigen una sesión iniciada; sin ella se
// envía al inicio de sesión
export const PUBLIC_ROUTES = ['/', '/login', '/registro', '/recuperar-contrasena', '/cambiar-contrasena'];

const NO_ACCESS = (
  <main className="page"><Mensaje tono="error">No tiene permisos para ver esta sección.</Mensaje></main>
);

/** Rutas de MS01. Devuelve undefined si la ruta no es de este módulo. */
export function useIdentityRoutes(session: Session | null) {
  // Usuarios marcados en Usuarios para cambiarles el estado o los roles; se descartan al cambiar de usuario
  const userId = session?.user.id;
  const [selection, setSelection] = useState<{ owner?: string; users: UserSummary[] }>({ users: [] });
  const selected = selection.owner === userId ? selection.users : [];
  const setSelected = (users: UserSummary[]) => setSelection({ owner: userId, users });

  // Rol que se edita, elegido en la lista de roles; se descarta al cambiar de usuario
  const [roleTarget, setRoleTarget] = useState<{ owner?: string; role: RoleDetail | null }>({ role: null });
  const targetRole = roleTarget.owner === userId ? roleTarget.role : null;
  const chooseRole = (role: RoleDetail | null) => setRoleTarget({ owner: userId, role });

  // Un rol borrado sale de los usuarios seleccionados; quien lo tenía como único queda con ESTUDIANTE (RF-MS01-10)
  const onRoleDeleted = (role: string) => setSelected(selected.map((u) => {
    const roles = u.roles.filter((r) => r !== role);
    return { ...u, roles: roles.length > 0 ? roles : ['ESTUDIANTE'] };
  }));

  // Cada pantalla se muestra según los permisos del token, nunca por el nombre del rol (RF-MS01-10)
  const can = (...codes: string[]) => hasPermission(session, ...codes);
  const canList = can(PERMISSION.USER_READ);
  const canChangeStatus = canList && can(PERMISSION.USER_STATUS);
  const canAssignRoles = canList && can(PERMISSION.USER_ROLES);
  const canManageRoles = can(PERMISSION.ROLE_MANAGE);
  const canSeeRoles = can(PERMISSION.ROLE_READ_ALL) || canManageRoles;

  return (route: string): ReactNode | undefined => {
    switch (route) {
      case '/': case '/login': return <Login />;
      case '/registro': return <Register />;
      case '/recuperar-contrasena': return <ForgotPassword />;
      case '/cambiar-contrasena': return <ResetPassword />;
      case '/perfil': return session && <Profile session={session} />;
      case '/perfil/editar': return session && <EditProfile session={session} />;
      case '/perfil/contrasena': return session && <ChangePassword session={session} />;
      // Usuarios: consultar, y sobre los seleccionados cambiar el estado (F-08) o los roles (F-09)
      case '/usuarios':
        return session && (canList
          ? <Users session={session} selected={selected} onSelectedChange={setSelected} />
          : NO_ACCESS);
      case '/usuarios/estado':
        return session && (canChangeStatus
          ? <ChangeStatus session={session} selected={selected} onSelectedChange={setSelected} />
          : NO_ACCESS);
      case '/usuarios/roles':
        return session && (canAssignRoles
          ? <ChangeRoles session={session} selected={selected} onSelectedChange={setSelected} />
          : NO_ACCESS);
      // Roles: la definición de cada rol (F-10 a F-13)
      case '/roles':
        return session && (canSeeRoles
          ? <Roles session={session} onEditRole={chooseRole} onRoleDeleted={onRoleDeleted} />
          : NO_ACCESS);
      case '/roles/nuevo':
        return session && (canManageRoles ? <RoleForm session={session} mode="create" role={null} /> : NO_ACCESS);
      case '/roles/editar':
        return session && (canManageRoles ? <RoleForm key={targetRole?.role} session={session} mode="edit" role={targetRole} /> : NO_ACCESS);
      default: return undefined;
    }
  };
}
