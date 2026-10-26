import type { ReactNode } from 'react';
import { Bell, Chat, Home, MapIcon, User } from './Icons';
import { rolesDeSesion } from '../services/campus';

const NAV = [
  { href: '#/', icon: <Home />, label: 'Inicio' },
  { href: '#/rutas', icon: <MapIcon />, label: 'Rutas' },
  { href: '#/reportar', icon: <Bell />, label: 'Reportar' },
  { href: '#/tutor', icon: <Chat />, label: 'Tutor AI' },
  { href: '#/perfil', icon: <User />, label: 'Perfil' },
];

// Solo ADMIN y COORDINADOR ven la administración de MS02
const ADMIN_NAV = { href: '#/admin/edificios', icon: <Home />, label: 'Administración' };

export function Navbar({ current }: { current: string }) {
  const roles = rolesDeSesion() ?? [];
  const veAdministracion = roles.includes('ADMIN') || roles.includes('COORDINADOR');
  const items = [...NAV.slice(0, -1)];
  if (veAdministracion) items.push(ADMIN_NAV);
  items.push(NAV[NAV.length - 1]);

  return (
    <nav className="navbar" aria-label="Navegación principal">
      <a className="brand" href="#/">CampusSeguro</a>
      <ul>
        {items.map((n) => (
          <li key={n.href}>
            <a href={n.href} aria-current={current.startsWith(n.href.slice(1)) && n.href !== '#/' || current === n.href.slice(1) ? 'page' : undefined}>{n.icon}{n.label}</a>
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
