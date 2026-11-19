import { STATE_LABEL, roleLabel } from '../utils/labels';
import '../styles/users.css';

/** Chip de estado de la cuenta (manual de identidad: Activo / Inactivo). */
export function StateChip({ state }: { state: string }) {
  return <span className={`chip state-${state.toLowerCase()}`}>{STATE_LABEL[state] ?? state}</span>;
}

/** Chip de rol. */
export function RoleChip({ role }: { role: string }) {
  return <span className="chip role" title={role}>{roleLabel(role)}</span>;
}
