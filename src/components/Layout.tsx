import type { ReactNode } from 'react';
import { Bell, Chat, Home, MapIcon, User } from './Icons';

const NAV = [
  { href: '#/', icon: <Home />, label: 'Inicio' },
  { href: '#/rutas', icon: <MapIcon />, label: 'Rutas' },
  { href: '#/reportar', icon: <Bell />, label: 'Reportar' },
  { href: '#/tutor', icon: <Chat />, label: 'Tutor AI' },
  { href: '#/perfil', icon: <User />, label: 'Perfil' },
];

export function Navbar({ current }: { current: string }) {
  return (
    <nav className="navbar" aria-label="Navegación principal">
      <a className="brand" href="#/">CampusSeguro</a>
      <ul>
        {NAV.map((n) => (
          <li key={n.href}>
            <a href={n.href} aria-current={current === n.href.slice(1) ? 'page' : undefined}>{n.icon}{n.label}</a>
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
