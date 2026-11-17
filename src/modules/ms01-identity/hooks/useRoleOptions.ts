import { useEffect, useState } from 'react';
import { hasPermission } from '../../../shared/services/session';
import { getRoles } from '../services/roles';
import { PERMISSION } from '../utils/permissions';
import { ROLE_LABEL, ROLE_OPTIONS } from '../utils/labels';
import type { Session } from '../../../shared/types';

export interface RoleOption { value: string; label: string }

const toOption = (role: string): RoleOption => ({ value: role, label: ROLE_LABEL[role] ?? role });

/**
 * Roles para los filtros y selectores. Con ms01:role:read_all salen del back (GET /roles devuelve el catálogo
 * completo), así que incluyen los roles que creó el administrador. Sin ese permiso, o mientras el back no responde,
 * se usan los ocho roles iniciales: la pantalla nunca se queda sin opciones. Al cambiar `version` se vuelven a pedir.
 */
export function useRoleOptions(session: Session, version = 0): RoleOption[] {
  const canReadAll = hasPermission(session, PERMISSION.ROLE_READ_ALL);
  const [options, setOptions] = useState<RoleOption[] | null>(null);

  useEffect(() => {
    if (!canReadAll) {
      return undefined;
    }
    let cancelled = false;
    getRoles(session)
      .then((items) => {
        if (!cancelled && items.length > 0) {
          setOptions(items.map((item) => toOption(item.role)).sort((a, b) => a.label.localeCompare(b.label, 'es')));
        }
      })
      .catch(() => {
        // Sin conexión con MS01: se quedan los roles iniciales
      });
    return () => { cancelled = true; };
  }, [session, canReadAll, version]);

  return options ?? ROLE_OPTIONS;
}
