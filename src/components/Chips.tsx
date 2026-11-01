import { ROLE_LABEL, STATE_LABEL } from '../utils/labels';
import '../users.css';

/** Chip de estado de la cuenta (manual de identidad: Activo / Inactivo). */
export function StateChip({ state }: { state: string }) {
  return <span className={`chip state-${state.toLowerCase()}`}>{STATE_LABEL[state] ?? state}</span>;
}

/** Chip de rol. */
export function RoleChip({ role }: { role: string }) {
  return <span className="chip role">{ROLE_LABEL[role] ?? role}</span>;
}
