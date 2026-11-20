import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '../types';
import { PERMISSION } from '../permissions';
import { sessionPermissions } from '../services/session';
import {
  BellIcon, CalendarIcon, CalendarPlus, ChatIcon, ClipboardCheck, CloseIcon, FilePen, HomeIcon, LifeBuoy, LogOut, MapLine,
  Megaphone, MenuIcon, ShieldCheck, UserIcon, Users,
} from './Icons';

interface MenuItem { href: string; icon: ReactNode; label: string }
interface MenuSection { title?: string; items: MenuItem[] }

const ROLE_LABEL: Record<string, string> = {
  ESTUDIANTE: 'Estudiante', PROFESOR: 'Profesor', ADMINISTRATIVO: 'Personal administrativo', BRIGADISTA: 'Brigadista',
  COORDINADOR: 'Coordinador de emergencias', ORGANIZADOR: 'Organizador de simulacros', ADMIN: 'Administrador', AUDITOR: 'Auditor',
};

/** Nombre visible de un rol: los iniciales con su nombre; los creados por el administrador, sin mayúsculas ni guion bajo. */
const roleName = (role: string) => {
  const text = role.replace(/_+/g, ' ').trim().toLowerCase();
  return ROLE_LABEL[role] ?? text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Main menu built from the permissions of the token (design "Menú hamburguesa": community, brigade and administrative
 * options). Only the options that the permissions allow are shown, nothing appears disabled. Roles are never checked:
 * the administrator can create roles and change their permissions.
 */
function menuFor(permissions: string[]): MenuSection[] {
  const can = (...p: string[]) => p.some((x) => permissions.includes(x));
  const sections: MenuSection[] = [{ items: [{ href: '#/simulacro', icon: <HomeIcon />, label: 'Inicio' }] }];

  if (can(PERMISSION.MS05_PANEL_READ_OWN)) {
    sections.push({
      title: 'Brigada',
      items: [
        { href: '#/brigadista', icon: <ClipboardCheck />, label: 'Panel de responsabilidades' },
        // Self-assignment (RF-BEI-01, option 2): pick a building on the map for scheduled or running events
        { href: '#/brigadista/autoasignacion', icon: <MapLine />, label: 'Auto asignación' },
      ],
    });
  }

  const emergencyItems: MenuItem[] = [];
  if (can(PERMISSION.MS04_CHECKIN_WRITE)) {
    // MS04 check-in (RF-MS04-01 to 04): report the own status during an active event
    emergencyItems.push({ href: '#/checkin', icon: <ShieldCheck />, label: 'Reportar mi estado' });
  }
  if (can(PERMISSION.MS05_INCIDENT_REPORT)) {
    emergencyItems.push({ href: '#/ayuda', icon: <LifeBuoy />, label: 'Necesito ayuda' });
  }
  if (can(PERMISSION.MS05_INCIDENT_MANAGE_OWN)) {
    emergencyItems.push({ href: '#/mis-incidentes', icon: <ClipboardCheck />, label: 'Mis incidentes' });
  }
  if (emergencyItems.length > 0) {
    sections.push({ title: 'Emergencia', items: emergencyItems });
  }

  const canManageEvents = can(PERMISSION.MS06_DRILL_MANAGE, PERMISSION.MS06_REAL_EVENT_MANAGE);
  const canReadEvents = canManageEvents || can(PERMISSION.MS06_DRILL_READ, PERMISSION.MS06_REAL_EVENT_READ);
  if (canReadEvents) {
    const eventItems: MenuItem[] = [{ href: '#/eventos', icon: <CalendarIcon />, label: 'Eventos' }];
    if (canManageEvents) {
      eventItems.push({ href: '#/eventos/nuevo', icon: <CalendarPlus />, label: 'Crear evento' });
    }
    sections.push({ title: 'Eventos', items: eventItems });
  }

  // Event list of MS04 (RF-MS04-13)
  if (can(PERMISSION.MS04_DASHBOARD_READ)) {
    sections.push({ title: 'Evacuación', items: [{ href: '#/evacuacion/eventos', icon: <CalendarIcon />, label: 'Eventos de evacuación' }] });
  }

  if (can(PERMISSION.MS03_ALERT_READ_HISTORY)) {
    const alertItems: MenuItem[] = [{ href: '#/alertas', icon: <BellIcon />, label: 'Alertas' }];
    if (can(PERMISSION.MS03_ALERT_MANAGE)) {
      alertItems.push({ href: '#/alertas/nueva', icon: <Megaphone />, label: 'Crear alerta' });
    }
    sections.push({ title: 'Alertas', items: alertItems });
  }

  if (can(PERMISSION.MS05_BRIGADIER_ASSIGN_TO_REAL, PERMISSION.MS05_BRIGADIER_ASSIGN_TO_DRILL)) {
    sections.push({ title: 'Brigada e incidentes', items: [{ href: '#/brigadistas', icon: <Users />, label: 'Gestión de brigadistas' }] });
  }

  const campusItems: MenuItem[] = [];
  if (can(PERMISSION.MS02_CAMPUS_READ)) {
    campusItems.push({ href: '#/edificios', icon: <HomeIcon />, label: 'Edificios y espacios' });
  }
  if (can(PERMISSION.MS02_ROUTE_READ)) {
    campusItems.push({ href: '#/rutas', icon: <MapLine />, label: 'Rutas de evacuación' });
  }
  if (can(PERMISSION.MS07_TUTOR_USE)) {
    campusItems.push({ href: '#/tutor', icon: <ChatIcon />, label: 'Tutor AI' });
  }
  if (campusItems.length > 0) {
    sections.push({ title: 'Campus', items: campusItems });
  }

  // MS08: indicators and audit (what each permission sees is decided by MS08)
  const analyticsItems: MenuItem[] = [];
  if (can(PERMISSION.MS08_INDICATORS_READ)) {
    analyticsItems.push({ href: '#/indicadores', icon: <ClipboardCheck />, label: 'Indicadores' });
  }
  if (can(PERMISSION.MS08_AUDIT_READ)) {
    analyticsItems.push({ href: '#/auditoria', icon: <FilePen />, label: 'Auditoría' });
  }
  if (analyticsItems.length > 0) {
    sections.push({ title: 'Analítica', items: analyticsItems });
  }

  // MS01 administration
  const adminItems: MenuItem[] = [];
  if (can('ms01:user:read')) {
    adminItems.push({ href: '#/usuarios', icon: <Users />, label: 'Usuarios' });
  }
  if (can('ms01:role:read_all', 'ms01:role:manage')) {
    adminItems.push({ href: '#/roles', icon: <ShieldCheck />, label: 'Roles' });
  }
  if (adminItems.length > 0) {
    sections.push({ title: 'Administración', items: adminItems });
  }

  const canAdministerCampus = can(
    PERMISSION.MS02_BUILDING_WRITE,
    PERMISSION.MS02_SPACE_WRITE,
    PERMISSION.MS02_SAFE_ZONE_WRITE,
    PERMISSION.MS02_ROUTE_WRITE,
    PERMISSION.MS02_ROUTE_STATUS_WRITE,
  );
  if (canAdministerCampus) {
    sections.push({
      title: 'Administración campus',
      items: [{ href: '#/admin/edificios', icon: <HomeIcon />, label: 'Edificios, zonas y rutas' }],
    });
  }
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
  // Ruta en la que se abrió el menú de la cuenta: al cambiar de pantalla queda cerrado sin otro efecto
  const [userOpenAt, setUserOpenAt] = useState<string | null>(null);
  const userOpen = userOpenAt === current;
  const setUserOpen = (value: boolean | ((v: boolean) => boolean)) =>
    setUserOpenAt((typeof value === 'function' ? value(userOpen) : value) ? current : null);
  const panel = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const userBox = useRef<HTMLDivElement>(null);
  const roles = session?.user.roles ?? [];
  const sections = menuFor(sessionPermissions(session));
  const active = currentHref(current, sections);

  // Se cierra al elegir una opción y con Escape; al abrir, el foco pasa al menú y al cerrar vuelve al botón
  useEffect(() => {
    if (!open) return undefined;
    panel.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Menú de la cuenta (esquina superior derecha): se cierra con Escape, al hacer clic fuera y al cambiar de pantalla
  useEffect(() => {
    if (!userOpen) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserOpenAt(null); };
    const onClick = (e: MouseEvent) => { if (!userBox.current?.contains(e.target as Node)) setUserOpenAt(null); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [userOpen]);

  const role = roles.map(roleName).join(' · ');
  const initials = (session?.user.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <>
      <nav className="navbar" aria-label="Barra principal">
        <div className="nav-left">
          <button ref={toggle} type="button" className="nav-burger" aria-label="Abrir menú" aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen(true)}><MenuIcon /></button>
          <a className="brand" href="#/simulacro">CampusSeguro</a>
        </div>
        {session && (
          <div className="nav-user" ref={userBox}>
            <button type="button" className="nav-user-btn" aria-haspopup="menu" aria-expanded={userOpen} aria-controls="user-menu"
              onClick={() => setUserOpen((v) => !v)}>
              <span className="nav-avatar" aria-hidden="true">{initials}</span>
              <span className="nav-who"><b>{session.user.email}</b><small>{role}</small></span>
            </button>
            {userOpen && (
              <ul id="user-menu" className="user-menu" role="menu" aria-label="Mi cuenta">
                <li role="none"><a role="menuitem" href="#/perfil"><UserIcon />Mi perfil</a></li>
                <li role="none"><a role="menuitem" href="#/perfil/contrasena"><ShieldCheck />Cambiar contraseña</a></li>
                <li role="none"><button type="button" role="menuitem" onClick={() => { setUserOpen(false); onLogout(); }}><LogOut />Cerrar sesión</button></li>
              </ul>
            )}
          </div>
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
