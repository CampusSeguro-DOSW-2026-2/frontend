import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '../types';
import { PERMISSION } from '../permissions';
import { sessionPermissions } from '../services/session';
import { etiquetaRol } from '../utils/etiquetas';
import { useNombreUsuario } from '../hooks/useNombreUsuario';
import {
  BarChart, BellIcon, BookOpen, Building, CalendarIcon, CalendarPlus, ChatIcon, ClipboardCheck, ClipboardList, CloseIcon,
  FilePen, FileText, HardHat, HomeIcon, KeyRound, LifeBuoy, ListChecks, Logo, LogOut, MapLine, MapPin, Megaphone, MenuIcon,
  ShieldCheck, Sliders, TrendingUp, TriangleAlert, Users,
} from './Icons';

interface MenuItem { href: string; icon: ReactNode; label: string }
interface MenuSection { title?: string; items: MenuItem[] }

/** Nombre visible de un rol, con tildes también en los creados por el administrador (shared/utils/etiquetas). */
const roleName = etiquetaRol;

/**
 * Main menu built from the permissions of the token (design "Menú hamburguesa": community, brigade and administrative
 * options). Only the options that the permissions allow are shown, nothing appears disabled. Roles are never checked:
 * the administrator can create roles and change their permissions.
 */
function menuFor(permissions: string[]): MenuSection[] {
  const can = (...p: string[]) => p.some((x) => permissions.includes(x));
  const sections: MenuSection[] = [];

  // Emergencia va primero: es lo que se busca con prisa durante un simulacro o un evento real
  const emergencyItems: MenuItem[] = [];
  if (can(PERMISSION.MS04_CHECKIN_WRITE)) {
    // MS04 check-in (RF-MS04-01 to 04): report the own status during an active event
    emergencyItems.push({ href: '#/checkin', icon: <ShieldCheck />, label: 'Reportar mi estado' });
  }
  if (can(PERMISSION.MS05_INCIDENT_REPORT)) {
    emergencyItems.push({ href: '#/ayuda', icon: <LifeBuoy />, label: 'Necesito ayuda' });
  }
  if (can(PERMISSION.MS05_INCIDENT_MANAGE_OWN)) {
    emergencyItems.push({ href: '#/mis-incidentes', icon: <TriangleAlert />, label: 'Mis incidentes' });
  }
  if (emergencyItems.length > 0) {
    sections.push({ title: 'Emergencia', items: emergencyItems });
  }

  sections.push({ title: emergencyItems.length > 0 ? 'General' : undefined, items: [{ href: '#/simulacro', icon: <HomeIcon />, label: 'Inicio' }] });

  if (can(PERMISSION.MS05_PANEL_READ_OWN)) {
    sections.push({
      title: 'Brigada',
      items: [
        { href: '#/brigadista', icon: <ClipboardList />, label: 'Panel de responsabilidades' },
        // Self-assignment (RF-BEI-01, option 2): pick a building on the map for scheduled or running events
        { href: '#/brigadista/autoasignacion', icon: <MapPin />, label: 'Auto asignación' },
      ],
    });
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
  // Quien ve Eventos sigue la evacuación desde «Ver en vivo» (mismo panel de MS04): no se duplica la entrada.
  // El brigadista, que no ve Eventos, conserva este acceso limitado a sus zonas.
  if (can(PERMISSION.MS04_DASHBOARD_READ) && !canReadEvents) {
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
    sections.push({ title: 'Brigada e incidentes', items: [{ href: '#/brigadistas', icon: <HardHat />, label: 'Gestión de brigadistas' }] });
  }

  const campusItems: MenuItem[] = [];
  if (can(PERMISSION.MS02_CAMPUS_READ)) {
    campusItems.push({ href: '#/edificios', icon: <Building />, label: 'Edificios y espacios' });
  }
  if (can(PERMISSION.MS02_ROUTE_READ)) {
    campusItems.push({ href: '#/rutas', icon: <MapLine />, label: 'Rutas de evacuación' });
  }
  if (campusItems.length > 0) {
    sections.push({ title: 'Campus', items: campusItems });
  }

  // MS07: tutor, learning center, evaluations and progress, each by its own permission
  const trainingItems: MenuItem[] = [];
  if (can(PERMISSION.MS07_CONTENT_READ)) {
    trainingItems.push({ href: '#/aprendizaje', icon: <BookOpen />, label: 'Aprendizaje' });
  }
  if (can(PERMISSION.MS07_QUIZ_TAKE)) {
    trainingItems.push({ href: '#/evaluaciones', icon: <ClipboardCheck />, label: 'Evaluaciones' });
    trainingItems.push({ href: '#/mi-progreso', icon: <TrendingUp />, label: 'Mi progreso' });
  }
  if (can(PERMISSION.MS07_TUTOR_USE)) {
    trainingItems.push({ href: '#/tutor', icon: <ChatIcon />, label: 'Tutor IA' });
  }
  if (trainingItems.length > 0) {
    sections.push({ title: 'Formación', items: trainingItems });
  }

  // MS08: indicators and audit, of drills or real events (MS08 returns only the kind each permission allows)
  const analyticsItems: MenuItem[] = [];
  // Indicadores elige los eventos de la lista de MS06: sin poder leer eventos, la pantalla no sirve y no se muestra
  if (can(PERMISSION.MS08_INDICATORS_DRILL_READ, PERMISSION.MS08_INDICATORS_REAL_EVENT_READ) && canReadEvents) {
    analyticsItems.push({ href: '#/indicadores', icon: <BarChart />, label: 'Indicadores' });
  }
  if (can(PERMISSION.MS08_AUDIT_DRILL_READ, PERMISSION.MS08_AUDIT_REAL_EVENT_READ)) {
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
    adminItems.push({ href: '#/roles', icon: <KeyRound />, label: 'Roles' });
  }
  if (can(PERMISSION.MS07_CONTENT_MANAGE)) {
    adminItems.push({ href: '#/admin/aprendizaje', icon: <FileText />, label: 'Gestionar contenidos' });
    adminItems.push({ href: '#/admin/evaluaciones', icon: <ListChecks />, label: 'Gestionar evaluaciones' });
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
      title: 'Administración del campus',
      items: [{ href: '#/admin/edificios', icon: <Sliders />, label: 'Edificios, zonas y rutas' }],
    });
  }
  return sections;
}

/**
 * Accesos rápidos de una app de emergencias (en el celular, barra inferior; en el computador, barra superior junto al
 * usuario), con los mismos iconos del menú: inicio, rutas de evacuación, reportar el estado (el check-in, desde donde
 * se pide ayuda con el evento ya elegido) y alertas. Cada uno se muestra solo con el permiso de su pantalla. El perfil
 * se abre tocando el usuario y el tutor, con el botón flotante.
 */
function accesosFor(permissions: string[]): MenuItem[] {
  const can = (p: string) => permissions.includes(p);
  const accesos: MenuItem[] = [{ href: '#/simulacro', icon: <HomeIcon />, label: 'Inicio' }];
  if (can(PERMISSION.MS02_ROUTE_READ)) accesos.push({ href: '#/rutas', icon: <MapLine />, label: 'Rutas' });
  if (can(PERMISSION.MS04_CHECKIN_WRITE)) accesos.push({ href: '#/checkin', icon: <ShieldCheck />, label: 'Reportar' });
  if (can(PERMISSION.MS03_ALERT_READ_HISTORY)) accesos.push({ href: '#/alertas', icon: <BellIcon />, label: 'Alertas' });
  return accesos;
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
  const sections = menuFor(sessionPermissions(session));
  const active = currentHref(current, sections);
  const accesos = accesosFor(sessionPermissions(session));
  const accesoActivo = currentHref(current, [{ items: accesos }]);
  // Botón flotante del tutor: con su permiso y fuera de la pantalla del tutor
  const tutorFlotante = sessionPermissions(session).includes(PERMISSION.MS07_TUTOR_USE)
    && current !== '/tutor' && !current.startsWith('/tutor/');

  // Se cierra al elegir una opción y con Escape. Mientras está abierto, el foco no sale del menú (Tab da la vuelta), la
  // página de fondo no se desplaza y al cerrar el foco vuelve al botón que lo abrió.
  useEffect(() => {
    if (!open) return undefined;
    const box = panel.current;
    box?.querySelector<HTMLElement>('a, button')?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); toggle.current?.focus(); return; }
      if (e.key !== 'Tab' || !box) return;
      const items = Array.from(box.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; };
  }, [open]);

  // Con más de 3 roles se muestra el principal y «+N»; la lista completa queda en el título
  const allRoles = roles.map(roleName).join(' · ');
  const role = roles.length > 3 ? `${roleName(roles[0])} +${roles.length - 1}` : allRoles;
  // Nombre del usuario (MS01) en lugar del correo; mientras carga o si MS01 no responde, el correo
  const nombre = useNombreUsuario(session);
  const visible = nombre ?? session?.user.email ?? '';
  const initials = nombre
    ? nombre.split(' ').slice(0, 2).map((p) => p.charAt(0)).join('').toUpperCase()
    : (session?.user.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <>
      <nav className="navbar" aria-label="Barra principal">
        <div className="nav-left">
          <button ref={toggle} type="button" className="nav-burger" aria-label="Abrir menú" aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen(true)}><MenuIcon /></button>
          <a className="brand" href="#/simulacro"><Logo />CampusSeguro</a>
        </div>
        {session && (
          <ul className="nav-rapidos" aria-label="Accesos rápidos">
            {accesos.map((a) => (
              <li key={a.href}>
                <a href={a.href} aria-current={accesoActivo === a.href ? 'page' : undefined}>
                  {a.icon}<span>{a.label}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {session && (
          <div className="nav-user">
            {/* Tocar el usuario abre Mi perfil, donde están la contraseña, los roles y cerrar sesión */}
            <a className="nav-user-btn" href="#/perfil" aria-label={`Mi perfil: ${visible}`}
              aria-current={current === '/perfil' || current.startsWith('/perfil/') ? 'page' : undefined}>
              <span className="nav-avatar" aria-hidden="true">{initials}</span>
              <span className="nav-who"><b>{visible}</b><small title={allRoles}>{role}</small></span>
            </a>
          </div>
        )}
      </nav>
      {session && (
        <nav className="nav-inferior" aria-label="Accesos rápidos">
          <ul>
            {accesos.map((a) => (
              <li key={a.href}>
                <a href={a.href} aria-current={accesoActivo === a.href ? 'page' : undefined}>
                  <span className="nav-inferior-ico">{a.icon}</span>{a.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {session && tutorFlotante && (
        <a className="tutor-flotante" href="#/tutor" aria-label="Abrir el Tutor IA" title="Tutor IA"><ChatIcon /></a>
      )}
      {open && (
        <div className="drawer-bg" role="presentation" onClick={() => setOpen(false)}>
          <aside id="main-menu" ref={panel} className="drawer" role="dialog" aria-modal="true" aria-label="Menú principal" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span className="brand"><Logo />CampusSeguro</span>
              <button type="button" className="nav-burger" aria-label="Cerrar menú" onClick={() => { setOpen(false); toggle.current?.focus(); }}><CloseIcon /></button>
            </div>
            {session && <div className="drawer-user"><span className="nav-avatar" aria-hidden="true">{initials}</span><span className="nav-who"><b>{visible}</b><small title={allRoles}>{role}</small></span></div>}
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

/** Enlace «← Volver» de las pantallas de detalle y de formulario: a dónde lleva y con qué texto. */
export interface Volver { href: string; texto: string }

/**
 * Encabezado rojo de las pantallas. En detalle y formularios lleva `volver` (siempre arriba a la izquierda, con área
 * táctil completa) para que la persona sepa cómo salir sin buscar en el menú.
 */
export function PageHeader({ badge, title, subtitle, context, volver }: {
  badge: string; title: string; subtitle: string; context?: ReactNode; volver?: Volver;
}) {
  return (
    <header className="page-header">
      {volver && <a className="ph-volver" href={volver.href}>← {volver.texto}</a>}
      <div className="hrow"><span className="badge">{badge}</span>{context && <span className="ctx">{context}</span>}</div>
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    </header>
  );
}
