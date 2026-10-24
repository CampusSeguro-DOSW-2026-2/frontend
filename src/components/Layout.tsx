import type { ReactNode } from 'react';
import { Bell, Chat, Home, MapIcon, User, Users } from './Icons';

const NAV = [
  { href: '#/simulacro', icon: <Home />, label: 'Inicio' },
  { href: '#/rutas', icon: <MapIcon />, label: 'Rutas' },
  { href: '#/reportar', icon: <Bell />, label: 'Reportar' },
  { href: '#/tutor', icon: <Chat />, label: 'Tutor AI' },
  { href: '#/perfil', icon: <User />, label: 'Perfil' },
];

// Solo para administradores y auditores (KAIR-51)
const USERS_NAV = { href: '#/usuarios', icon: <Users />, label: 'Usuarios' };

// "Perfil" también queda activo en #/perfil/editar, "Usuarios" en #/usuarios/estado, etc.
const isCurrent = (current: string, href: string) => {
  const path = href.slice(1);
  return current === path || current.startsWith(`${path}/`);
};

export function Navbar({ current, roles = [] }: { current: string; roles?: string[] }) {
  const canList = roles.includes('ADMIN') || roles.includes('AUDITOR');
  const items = canList ? [...NAV.slice(0, -1), USERS_NAV, NAV[NAV.length - 1]] : NAV;

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
