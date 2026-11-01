import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeader } from '../components/Layout';
import { RoleChip } from '../components/Chips';
import { RoleCatalog } from '../components/RoleCatalog';
import { Search } from '../components/Icons';
import { errorMessage, searchUsers } from '../services/users';
import { ROLE_OPTIONS } from '../utils/labels';
import type { Session, UserPage, UserSearch, UserSummary } from '../types';
import '../users.css';

const PAGE_SIZE = 20;

type View = 'assign' | 'catalog';

const VIEWS: { value: View; label: string }[] = [
  { value: 'assign', label: 'Asignar roles' },
  { value: 'catalog', label: 'Catálogo de roles y permisos' },
];

// RG-03: la búsqueda no admite etiquetas HTML
const HTML_CHARS = /[<>]/;

// Resultado de la última búsqueda, junto con los criterios con los que se pidió
interface Result { query: UserSearch; page?: UserPage; error?: string }

interface Props {
  session: Session;
  selected: UserSummary[];
  onSelectedChange: (users: UserSummary[]) => void;
}

/**
 * Gestión de roles y permisos (RF-MS01-05, solo administrador): busca usuarios por correo o por rol,
 * selecciona uno o varios para agregarles o retirarles roles (F-09) y consulta el catálogo completo.
 */
export default function Roles({ session, selected, onSelectedChange }: Props) {
  const [view, setView] = useState<View>('assign');
  const [query, setQuery] = useState<UserSearch>({ email: '', state: '', role: '', page: 0, size: PAGE_SIZE });
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    searchUsers(session, query)
      .then((page) => {
        if (!cancelled) setResult({ query, page });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ query, error: errorMessage(err) });
      });
    return () => { cancelled = true; };
  }, [session, query]);

  const loading = result?.query !== query;
  const data = result?.page ?? null;
  const error = result?.error ?? '';

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

  const setRoleFilter = (value: string) => setQuery((q) => ({ ...q, role: value, page: 0 }));
  const goToPage = (page: number) => setQuery((q) => ({ ...q, page }));

  // ---- Selección: se conserva al cambiar de página y de filtros ----
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
        badge="ADMINISTRADOR"
        title="Roles y permisos"
        subtitle="Agrega o retira roles a la comunidad y consulta qué permite cada rol."
        context={view === 'assign' && data ? `${total} ${total === 1 ? 'usuario' : 'usuarios'}` : undefined}
      />
      <main className="content">
        <div className="pills" role="group" aria-label="Vista">
          {VIEWS.map((v) => (
            <button type="button" key={v.value} className="pill" aria-pressed={view === v.value} onClick={() => setView(v.value)}>
              {v.label}
            </button>
          ))}
        </div>

        {view === 'catalog' && <RoleCatalog session={session} />}

        {view === 'assign' && (
          <>
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
                    placeholder="Ingresa el correo o parte del correo"
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
              <div className="field">
                <label htmlFor="role">Rol</label>
                <div className="input">
                  <select id="role" value={query.role} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="">Todos</option>
                    {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="selbar">
              <button
                type="button"
                className="btn navy"
                disabled={selected.length === 0}
                onClick={() => { window.location.hash = '#/roles/editar'; }}
              >
                Editar roles
              </button>
              <span role="status">
                {selected.length === 0
                  ? 'Selecciona usuarios para agregarles o retirarles roles.'
                  : `${selected.length} ${selected.length === 1 ? 'usuario seleccionado' : 'usuarios seleccionados'}`}
              </span>
            </div>

            {error && (
              <div className="panel wide-panel">
                <p className="notice err" role="alert">{error}</p>
                <button type="button" className="btn white" onClick={() => setQuery((q) => ({ ...q }))}>Reintentar</button>
              </div>
            )}

            {!error && (
              <div className="tablewrap" aria-busy={loading}>
                <table className="utable">
                  <caption className="sr-only">Usuarios y sus roles</caption>
                  <thead>
                    <tr>
                      <th className="check">
                        <input
                          type="checkbox"
                          aria-label="Seleccionar todos los usuarios de esta página"
                          checked={allOnPageSelected}
                          onChange={togglePage}
                          disabled={rows.length === 0}
                        />
                      </th>
                      <th scope="col">Correo</th>
                      <th scope="col">Roles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((user) => (
                      <tr key={user.id}>
                        <td className="check">
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar a ${user.email}`}
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleRow(user)}
                          />
                        </td>
                        <td className="mail">
                          {user.email}
                          {user.id === session.user.id && <span className="me"> (tú)</span>}
                        </td>
                        <td><div className="chips">{user.roles.map((role) => <RoleChip key={role} role={role} />)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {loading && rows.length === 0 && <p className="empty" role="status">Cargando usuarios…</p>}
                {!loading && rows.length === 0 && <p className="empty">No se encontraron usuarios con esos criterios.</p>}
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
          </>
        )}
      </main>
    </>
  );
}
