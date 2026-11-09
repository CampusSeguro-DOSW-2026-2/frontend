import '../styles/navegacion-admin.css';

interface Pestana {
  href: string;
  texto: string;
  /** Rutas (sin #) en las que la pestaña aparece activa. */
  activa: (ruta: string) => boolean;
}

const es = (base: string) => (ruta: string) => ruta === base || ruta.startsWith(`${base}/`);

// Todas las pantallas de administración de MS02, para poder llegar a cada una sin escribir la URL.
const PESTANAS: Pestana[] = [
  { href: '#/admin/edificios', texto: 'Edificios', activa: es('/admin/edificios') },
  { href: '#/admin/campus', texto: 'Campus y zonas abiertas', activa: es('/admin/campus') },
  { href: '#/admin/zonas', texto: 'Zonas seguras', activa: es('/admin/zonas') },
  { href: '#/admin/rutas', texto: 'Rutas de evacuación', activa: es('/admin/rutas') },
  { href: '#/admin/preventiva', texto: 'Recomendaciones preventivas', activa: es('/admin/preventiva') },
];

export function NavegacionAdmin({ ruta }: { ruta: string }) {
  return (
    <nav className="cs-subnav no-imprimir" aria-label="Administración de campus">
      <ul>
        {PESTANAS.map((p) => (
          <li key={p.href}>
            <a href={p.href} aria-current={p.activa(ruta) ? 'page' : undefined}>{p.texto}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
