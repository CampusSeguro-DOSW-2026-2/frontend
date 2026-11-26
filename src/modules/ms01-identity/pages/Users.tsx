import { EstadoVacio } from '../../../shared/components/EstadoVacio';
import { Cargando } from '../../../shared/components/Cargando';
import { Mensaje } from '../../../shared/components/Mensaje';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { RoleChip, StateChip } from '../components/Chips';
import { Search } from '../../../shared/components/Icons';
import { errorMessage, searchUsers } from '../services/users';
import { useRoleOptions } from '../hooks/useRoleOptions';
import { hasPermission } from '../../../shared/services/session';
import { PERMISSION } from '../utils/permissions';
import type { Session } from '../../../shared/types';
import type { UserPage, UserSearch, UserSummary } from '../types';
import '../styles/users.css';

const PAGE_SIZE = 20;

const STATE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'INACTIVO', label: 'Inactivos' },
];

// RG-03: la búsqueda no admite etiquetas HTML
const HTML_CHARS = /[<>]/;

interface Props {
  session: Session;
  selected: UserSummary[];
  onSelectedChange: (users: UserSummary[]) => void;
}

export default function Users({ session, selected, onSelectedChange }: Props) {
  // Consultar exige ms01:user:read; seleccionar usuarios, poder cambiarles el estado o los roles
  const canStatus = hasPermission(session, PERMISSION.USER_STATUS);
  const canRoles = hasPermission(session, PERMISSION.USER_ROLES);
  const isAdmin = canStatus || canRoles;
  const roleOptions = useRoleOptions(session);

  const [query, setQuery] = useState<UserSearch>({ email: '', state: '', role: '', page: 0, size: PAGE_SIZE });
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');
  const [data, setData] = useState<UserPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchUsers(session, query)
      .then((result) => {
        if (!cancelled) {
          setError('');
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [session, query]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (HTML_CHARS.test(value)) {
      setDraftError('La búsqueda no puede contener etiquetas HTML.');
      return;
    }
    if (value.length > 100) {
      setDraftError('La búsqueda no puede superar los 100 caracteres.');
      return;
    }
    setDraftError('');
    setQuery((q) => ({ ...q, email: value, page: 0 }));
  };

  const setStateFilter = (value: string) => setQuery((q) => ({ ...q, state: value, page: 0 }));
  const setRoleFilter = (value: string) => setQuery((q) => ({ ...q, role: value, page: 0 }));
  const goToPage = (page: number) => setQuery((q) => ({ ...q, page }));

  // ---- Selección (solo administrador): se conserva al cambiar de página y de filtros ----
  const rows = data?.items ?? [];
  const selectedIds = new Set(selected.map((u) => u.id));
  const allOnPageSelected = rows.length > 0 && rows.every((u) => selectedIds.has(u.id));

  const toggleRow = (user: UserSummary) => {
    if (selectedIds.has(user.id)) {
      onSelectedChange(selected.filter((s) => s.id !== user.id));
    } else {
      onSelectedChange([...selected, user]);
    }
  };

  const togglePage = () => {
    if (allOnPageSelected) {
      onSelectedChange(selected.filter((s) => !rows.some((r) => r.id === s.id)));
    } else {
      onSelectedChange([...selected, ...rows.filter((r) => !selectedIds.has(r.id))]);
    }
  };

  const total = data?.totalElements ?? 0;

  return (
    <>
      <PageHeader
        badge={isAdmin ? 'ADMINISTRACIÓN' : 'CONSULTA'}
        title="Usuarios registrados"
        subtitle={isAdmin
          ? 'Busque usuarios, selecciónelos y cambie su estado o sus roles.'
          : 'Busque y consulte a la comunidad que participa en la respuesta a emergencias.'}
        context={data ? `${total} ${total === 1 ? 'usuario' : 'usuarios'}` : undefined}
      />
      <main className="content">
        <form className="toolbar" role="search" noValidate onSubmit={onSearch}>
          <div className="field">
            <label htmlFor="q">Buscar por correo</label>
            <div className={`input${draftError ? ' bad' : ''}`}>
              <Search />
              <input
                id="q"
                type="text"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setDraftError(''); }}
                placeholder="Ingrese el correo o parte del correo"
                maxLength={100}
                aria-invalid={!!draftError}
                aria-describedby={draftError ? 'q-msg' : undefined}
              />
            </div>
            {draftError && <span id="q-msg" className="error" role="alert">{draftError}</span>}
          </div>
          <button type="submit" className="btn red">Buscar</button>
        </form>

        <div className="filters">
          <div className="field" role="group" aria-label="Filtrar por estado">
            <span className="lbl">Estado</span>
            <div className="pills">
              {STATE_FILTERS.map((f) => (
                <button
                  type="button"
                  key={f.value || 'todos'}
                  className="pill"
                  aria-pressed={query.state === f.value}
                  onClick={() => setStateFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="role">Rol</label>
            <div className="input">
              <select id="role" value={query.role} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">Todos</option>
                {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="selbar">
            {canStatus && (
              <button type="button" className="btn navy" disabled={selected.length === 0}
                onClick={() => { window.location.hash = '#/usuarios/estado'; }}>
                Cambiar estado
              </button>
            )}
            {canRoles && (
              <button type="button" className="btn navy" disabled={selected.length === 0}
                onClick={() => { window.location.hash = '#/usuarios/roles'; }}>
                Editar roles
              </button>
            )}
            <span role="status">
              {selected.length === 0
                ? 'Seleccione usuarios para cambiar su estado o sus roles.'
                : `${selected.length} ${selected.length === 1 ? 'usuario seleccionado' : 'usuarios seleccionados'}`}
            </span>
          </div>
        )}

        {error && (
          <div className="panel wide-panel">
            <Mensaje tono="error">{error}</Mensaje>
            <button type="button" className="btn white" onClick={() => setQuery((q) => ({ ...q }))}>Reintentar</button>
          </div>
        )}

        {!error && (
          <div className="tablewrap" aria-busy={loading}>
            <table className="utable">
              <caption className="sr-only">Lista de usuarios</caption>
              <thead>
                <tr>
                  {isAdmin && (
                    <th className="check">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todos los usuarios de esta página"
                        checked={allOnPageSelected}
                        onChange={togglePage}
                        disabled={rows.length === 0}
                      />
                    </th>
                  )}
                  <th scope="col">Correo</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id}>
                    {isAdmin && (
                      <td className="check">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar a ${user.email}`}
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleRow(user)}
                        />
                      </td>
                    )}
                    <td className="mail">
                      {user.email}
                      {user.id === session.user.id && <span className="me"> (usted)</span>}
                    </td>
                    <td><div className="chips">{user.roles.map((role) => <RoleChip key={role} role={role} />)}</div></td>
                    <td><StateChip state={user.state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && rows.length === 0 && <Cargando texto="Cargando usuarios…" />}
            {!loading && rows.length === 0 && <EstadoVacio titulo="No se encontraron usuarios">Pruebe con otros criterios de búsqueda o filtros.</EstadoVacio>}
          </div>
        )}

        {!error && data && data.totalPages > 0 && (
          <nav className="pager" aria-label="Paginación">
            <button type="button" className="btn white" disabled={loading || data.page <= 0} onClick={() => goToPage(data.page - 1)}>
              Anterior
            </button>
            <span>Página {data.page + 1} de {data.totalPages}</span>
            <button type="button" className="btn white" disabled={loading || data.page + 1 >= data.totalPages} onClick={() => goToPage(data.page + 1)}>
              Siguiente
            </button>
          </nav>
        )}
      </main>
    </>
  );
}
