import { useEffect, useState } from 'react';
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
import type { UserSummary } from './types';
import type { Session } from '../../shared/types';

// Pantallas públicas: inicio de sesión, registro y recuperación de contraseña. Se muestran a pantalla
// completa, sin la barra de navegación principal. Todas las demás exigen una sesión iniciada; sin ella se
// envía al inicio de sesión
export const PUBLIC_ROUTES = ['/', '/login', '/registro', '/recuperar-contrasena', '/cambiar-contrasena'];

const NO_ACCESS = (
  <main className="page"><p className="notice err" role="alert">No tienes permisos para ver esta sección.</p></main>
);

/** Rutas de MS01. Devuelve undefined si la ruta no es de este módulo. */
export function useIdentityRoutes(session: Session | null) {
  // Usuarios marcados en el listado (administrador) para cambiarles el estado
  const [selected, setSelected] = useState<UserSummary[]>([]);
  // Usuarios marcados en el listado de roles (administrador); se descartan al cambiar de usuario
  const [roleSelection, setRoleSelection] = useState<{ owner?: string; users: UserSummary[] }>({ users: [] });

  // Al cambiar de usuario no se arrastra la selección del anterior
  const userId = session?.user.id;
  useEffect(() => { setSelected([]); }, [userId]);

  const roleSelected = roleSelection.owner === userId ? roleSelection.users : [];
  const setRoleSelected = (users: UserSummary[]) => setRoleSelection({ owner: userId, users });

  const roles = session?.user.roles ?? [];
  const isAdmin = roles.includes('ADMIN');
  const canList = isAdmin || roles.includes('AUDITOR');

  return (route: string): ReactNode | undefined => {
    switch (route) {
      case '/': case '/login': return <Login />;
      case '/registro': return <Register />;
      case '/recuperar-contrasena': return <ForgotPassword />;
      case '/cambiar-contrasena': return <ResetPassword />;
      case '/perfil': return session && <Profile session={session} />;
      case '/perfil/editar': return session && <EditProfile session={session} />;
      case '/perfil/contrasena': return session && <ChangePassword session={session} />;
      case '/usuarios':
        return session && (canList
          ? <Users session={session} selected={selected} onSelectedChange={setSelected} />
          : NO_ACCESS);
      case '/usuarios/estado':
        return session && (isAdmin
          ? <ChangeStatus session={session} selected={selected} onSelectedChange={setSelected} />
          : NO_ACCESS);
      case '/roles':
        return session && (isAdmin
          ? <Roles session={session} selected={roleSelected} onSelectedChange={setRoleSelected} />
          : NO_ACCESS);
      case '/roles/editar':
        return session && (isAdmin
          ? <ChangeRoles session={session} selected={roleSelected} onSelectedChange={setRoleSelected} />
          : NO_ACCESS);
      default: return undefined;
    }
  };
}
