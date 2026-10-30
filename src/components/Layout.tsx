import type { ReactNode } from 'react';
import { Bell, Chat, Home, MapIcon, ShieldCheck, User, Users } from './Icons';

const NAV = [
  { href: '#/simulacro', icon: <Home />, label: 'Inicio' },
  { href: '#/rutas', icon: <MapIcon />, label: 'Rutas' },
  { href: '#/reportar', icon: <Bell />, label: 'Reportar' },
  { href: '#/tutor', icon: <Chat />, label: 'Tutor AI' },
  { href: '#/perfil', icon: <User />, label: 'Perfil' },
];

// Solo para administradores y auditores (KAIR-51)
const USERS_NAV = { href: '#/usuarios', icon: <Users />, label: 'Usuarios' };

// Solo para administradores: gestión de roles y permisos (RF-MS01-05)
const ROLES_NAV = { href: '#/roles', icon: <ShieldCheck />, label: 'Roles' };

// "Perfil" también queda activo en #/perfil/editar, "Usuarios" en #/usuarios/estado, "Roles" en #/roles/editar, etc.
const isCurrent = (current: string, href: string) => {
  const path = href.slice(1);
  return current === path || current.startsWith(`${path}/`);
};

export function Navbar({ current, roles = [] }: { current: string; roles?: string[] }) {
  const isAdmin = roles.includes('ADMIN');
  const canList = isAdmin || roles.includes('AUDITOR');
  const items = [...NAV.slice(0, -1)];
  if (canList) items.push(USERS_NAV);
  if (isAdmin) items.push(ROLES_NAV);
  items.push(NAV[NAV.length - 1]);

  return (
    <nav className="navbar" aria-label="Navegación principal">
      <a className="brand" href="#/simulacro">CampusSeguro</a>
      <ul>
        {items.map((n) => (
          <li key={n.href}>
            <a href={n.href} aria-current={isCurrent(current, n.href) ? 'page' : undefined}>{n.icon}{n.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PageHeader({ badge, title, subtitle, context }: { badge: string; title: string; subtitle: string; context?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="hrow"><span className="badge">{badge}</span>{context && <span className="ctx">{context}</span>}</div>
      <div><h1>{title}</h1><p>{subtitle}</p></div>
    </header>
  );
}
