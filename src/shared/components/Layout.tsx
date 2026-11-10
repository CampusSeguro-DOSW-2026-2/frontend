import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '../types';
import {
  BellIcon, CalendarIcon, CalendarPlus, ChatIcon, ClipboardCheck, CloseIcon, HomeIcon, LifeBuoy, LogOut, MapLine,
  Megaphone, MenuIcon, ShieldCheck, UserIcon, Users,
} from './Icons';

interface MenuItem { href: string; icon: ReactNode; label: string }
interface MenuSection { title?: string; items: MenuItem[] }

const ROLE_LABEL: Record<string, string> = {
  ESTUDIANTE: 'Estudiante', PROFESOR: 'Profesor', ADMINISTRATIVO: 'Personal administrativo', BRIGADISTA: 'Brigadista',
  COORDINADOR: 'Coordinador de emergencias', ORGANIZADOR: 'Organizador de simulacros', ADMIN: 'Administrador', AUDITOR: 'Auditor',
};

/**
 * Menú principal según los roles de la sesión (diseño "Menú hamburguesa": comunidad, brigadista y roles
 * administrativos). Solo se muestran las opciones que el rol puede usar; nada aparece deshabilitado.
 */
function menuFor(roles: string[]): MenuSection[] {
  const has = (...r: string[]) => r.some((x) => roles.includes(x));
  const coordination = has('COORDINADOR', 'ORGANIZADOR');
  const oversight = has('ADMIN', 'AUDITOR');
  const community = has('ESTUDIANTE', 'PROFESOR', 'ADMINISTRATIVO', 'BRIGADISTA', 'COORDINADOR', 'ORGANIZADOR');
  const sections: MenuSection[] = [{ items: [{ href: '#/simulacro', icon: <HomeIcon />, label: 'Inicio' }] }];

  if (has('BRIGADISTA')) {
    sections.push({ title: 'Brigada', items: [{ href: '#/brigadista', icon: <ClipboardCheck />, label: 'Panel de responsabilidades' }] });
  }
  if (community) {
    sections.push({
      title: 'Emergencia',
      items: [
        // Check-in de MS04 (RF-MS04-01 a 04): reportar el propio estado durante un evento activo
        { href: '#/checkin', icon: <ShieldCheck />, label: 'Reportar mi estado' },
        { href: '#/ayuda', icon: <LifeBuoy />, label: 'Necesito ayuda' },
      ],
    });
  }
  if (coordination || oversight) {
    const items: MenuItem[] = [{ href: '#/eventos', icon: <CalendarIcon />, label: 'Eventos' }];
    if (coordination) items.push({ href: '#/eventos/nuevo', icon: <CalendarPlus />, label: 'Crear evento' });
    sections.push({ title: 'Eventos', items });
  }
  // Permisos de MS03 (ms03-alerts/permissions.ts): historial para coordinador, organizador y auditor; crear, solo coordinador
  if (coordination || has('AUDITOR')) {
    const items: MenuItem[] = [{ href: '#/alertas', icon: <BellIcon />, label: 'Alertas' }];
    if (has('COORDINADOR')) items.push({ href: '#/alertas/nueva', icon: <Megaphone />, label: 'Crear alerta' });
    sections.push({ title: 'Alertas', items });
  }
  if (coordination) {
    sections.push({ title: 'Brigada e incidentes', items: [{ href: '#/brigadistas', icon: <Users />, label: 'Gestión de brigadistas' }] });
  }
  const campusRead = has(
    'ESTUDIANTE',
    'PROFESOR',
    'ADMINISTRATIVO',
    'BRIGADISTA',
    'COORDINADOR',
    'ORGANIZADOR',
    'ADMIN',
    'AUDITOR',
  );

  const campusItems: MenuItem[] = [];

  campusItems.push({ href: '#/edificios', icon: <HomeIcon />, label: 'Edificios y espacios' });

  if (campusRead) {
    campusItems.push(
      { href: '#/rutas', icon: <MapLine />, label: 'Rutas de evacuación' },
    );
  }
  campusItems.push({ href: '#/tutor', icon: <ChatIcon />, label: 'Tutor AI' });

  sections.push({
    title: 'Campus',
    items: campusItems,
  });
  if (oversight) {
    const items: MenuItem[] = [{ href: '#/usuarios', icon: <Users />, label: 'Usuarios' }];
    if (has('ADMIN')) items.push({ href: '#/roles', icon: <ShieldCheck />, label: 'Roles y permisos' });
    sections.push({ title: 'Administración', items });
  }
  if (has('ADMIN', 'COORDINADOR')) {
    sections.push({
      title: 'Administración campus',
      items: [{ href: '#/admin/edificios', icon: <HomeIcon />, label: 'Edificios, zonas y rutas' }],
    });
  }
  sections.push({ title: 'Cuenta', items: [{ href: '#/perfil', icon: <UserIcon />, label: 'Perfil' }] });
  return sections;
}

// "Perfil" también queda activo en #/perfil/editar, "Eventos" en #/eventos/{id}, etc.; el más específico gana
function currentHref(current: string, sections: MenuSection[]): string | undefined {
  const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  return hrefs
    .filter((h) => { const p = h.slice(1); return current === p || current.startsWith(`${p}/`); })
    .sort((a, b) => b.length - a.length)[0];
}

export function Navbar({ current, session, onLogout }: { current: string; session: Session | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const roles = session?.user.roles ?? [];
  const sections = menuFor(roles);
  const active = currentHref(current, sections);

  // Se cierra al elegir una opción y con Escape; al abrir, el foco pasa al menú y al cerrar vuelve al botón
  useEffect(() => {
    if (!open) return undefined;
    panel.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const role = roles.map((r) => ROLE_LABEL[r] ?? r).join(' · ');
  const initials = (session?.user.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <>
      <nav className="navbar" aria-label="Barra principal">
        <div className="nav-left">
          <button ref={toggle} type="button" className="nav-burger" aria-label="Abrir menú" aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen(true)}><MenuIcon /></button>
          <a className="brand" href="#/simulacro">CampusSeguro</a>
        </div>
        {session && (
          <div className="nav-user"><span className="nav-avatar" aria-hidden="true">{initials}</span><span className="nav-who"><b>{session.user.email}</b><small>{role}</small></span></div>
        )}
      </nav>
      {open && (
        <div className="drawer-bg" role="presentation" onClick={() => setOpen(false)}>
          <aside id="main-menu" ref={panel} className="drawer" role="dialog" aria-modal="true" aria-label="Menú principal" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span className="brand">CampusSeguro</span>
              <button type="button" className="nav-burger" aria-label="Cerrar menú" onClick={() => { setOpen(false); toggle.current?.focus(); }}><CloseIcon /></button>
            </div>
            {session && <div className="drawer-user"><span className="nav-avatar" aria-hidden="true">{initials}</span><span className="nav-who"><b>{session.user.email}</b><small>{role}</small></span></div>}
            <div className="drawer-items">
              {sections.map((s) => (
                <div key={s.title ?? 'main'} className="drawer-sec">
                  {s.title && <span className="drawer-title">{s.title}</span>}
                  <ul>
                    {s.items.map((i) => (
                      <li key={i.href}><a href={i.href} onClick={() => setOpen(false)} aria-current={active === i.href ? 'page' : undefined}>{i.icon}{i.label}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {session && <button type="button" className="drawer-out" onClick={onLogout}><LogOut />Cerrar sesión</button>}
          </aside>
        </div>
      )}
    </>
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
