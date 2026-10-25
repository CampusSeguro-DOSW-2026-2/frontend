import { RoleChip } from './Chips';
import { MODULE_LABEL, PERMISSION_LABEL } from '../utils/labels';
import type { RolePermissions } from '../types';
import '../users.css';

// El módulo es el primer segmento del código ms:recurso:acción
const moduleOf = (code: string) => code.split(':')[0];

/** Agrupa los códigos por módulo conservando el orden en que llegan (el de la matriz). */
function groupByModule(codes: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const code of codes) {
    const module = moduleOf(code);
    const items = groups.get(module) ?? [];
    items.push(code);
    groups.set(module, items);
  }
  return [...groups.entries()];
}

/** Permisos agrupados por módulo: la descripción de cada uno y, al lado, su código. */
export function PermissionGroups({ codes }: { codes: string[] }) {
  return (
    <div className="perm-groups">
      {groupByModule(codes).map(([module, items]) => (
        <section key={module} className="perm-group">
          <h3>{MODULE_LABEL[module] ?? module.toUpperCase()}</h3>
          <ul>
            {items.map((code) => (
              <li key={code}>
                <span>{PERMISSION_LABEL[code] ?? code}</span>
                <code>{code}</code>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Un rol desplegable con la cantidad de permisos que concede y su detalle por módulo. */
export function RoleDetails({ item, open = false }: { item: RolePermissions; open?: boolean }) {
  const total = item.permissions.length;
  return (
    <details className="role-block" open={open}>
      <summary>
        <RoleChip role={item.role} />
        <span className="count">{total} {total === 1 ? 'permiso' : 'permisos'}</span>
      </summary>
      <PermissionGroups codes={item.permissions} />
    </details>
  );
}
