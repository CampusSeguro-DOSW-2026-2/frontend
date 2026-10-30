import { useEffect, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { TextField } from '../components/TextField';
import { ApiError } from '../services/identity';
import { errorMessage, getMyProfile, updateMyProfile } from '../services/users';
import { nameError } from '../utils/validation';
import type { ProfileDraft, Session } from '../types';
import '../users.css';

const EMPTY: ProfileDraft = { firstName: '', secondName: '', firstLastName: '', secondLastName: '' };
type Errors = Partial<Record<keyof ProfileDraft, string>>;

// Orden visual de los campos: sirve para enfocar el primero con error
const FIELD_ORDER: (keyof ProfileDraft)[] = ['firstName', 'secondName', 'firstLastName', 'secondLastName'];

// Mismas reglas y mensajes que el back (F-03): el back sigue siendo quien decide.
function validate(d: ProfileDraft): Errors {
  const e: Errors = {};

  const firstName = nameError('firstName', d.firstName);
  if (firstName) e.firstName = firstName;
  const secondName = nameError('secondName', d.secondName);
  if (secondName) e.secondName = secondName;
  const firstLastName = nameError('firstLastName', d.firstLastName);
  if (firstLastName) e.firstLastName = firstLastName;
  const secondLastName = nameError('secondLastName', d.secondLastName);
  if (secondLastName) e.secondLastName = secondLastName;
  return e;
}

const focusField = (errs: Errors) => {
  const first = FIELD_ORDER.find((k) => errs[k]);
  if (first) document.getElementById(first)?.focus();
  return !!first;
};

export default function EditProfile({ session }: { session: Session }) {
  const [form, setForm] = useState<ProfileDraft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Se precarga el formulario con los datos actuales
  useEffect(() => {
    let cancelled = false;
    getMyProfile(session)
      .then((p) => {
        if (!cancelled) {
          setForm({ firstName: p.firstName, secondName: p.secondName, firstLastName: p.firstLastName, secondLastName: p.secondLastName });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setServerError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [session]);

  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
    setServerError('');
  };

  const submit = async () => {
    const e = validate(form);
    setErrors(e);
    if (focusField(e)) return;

    setSubmitting(true);
    setServerError('');
    try {
      await updateMyProfile(session, form);
      window.location.hash = '#/perfil';
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (!focusField(err.fields)) setServerError(err.message);
      } else {
        setServerError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        badge="MI PERFIL"
        title="Editar perfil"
        subtitle="Actualiza tus nombres y apellidos. El correo, el rol y el estado no se pueden modificar desde aquí."
      />
      <main className="content narrow">
        {loading ? (
          <p className="notice" role="status">Cargando tu perfil…</p>
        ) : (
          <form
            className="panel"
            noValidate
            aria-busy={submitting}
            onSubmit={(e) => { e.preventDefault(); void submit(); }}
          >
            <div className="two">
              <TextField id="firstName" label="Primer nombre" placeholder="Ingresa tu primer nombre"
                value={form.firstName} onChange={(v) => set('firstName', v)} error={errors.firstName}
                autoComplete="given-name" maxLength={30} />
              <TextField id="secondName" label="Segundo nombre" optional placeholder="Ingresa tu segundo nombre"
                value={form.secondName} onChange={(v) => set('secondName', v)} error={errors.secondName}
                autoComplete="additional-name" maxLength={30} />
            </div>
            <div className="two">
              <TextField id="firstLastName" label="Primer apellido" placeholder="Ingresa tu primer apellido"
                value={form.firstLastName} onChange={(v) => set('firstLastName', v)} error={errors.firstLastName}
                autoComplete="family-name" maxLength={30} />
              <TextField id="secondLastName" label="Segundo apellido" optional placeholder="Ingresa tu segundo apellido"
                value={form.secondLastName} onChange={(v) => set('secondLastName', v)} error={errors.secondLastName}
                maxLength={30} />
            </div>

            {serverError && <p className="notice err" role="alert">{serverError}</p>}

            <div className="actions">
              <button type="submit" className="btn red" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Cambiar'}
              </button>
              <a className="btn white" href="#/perfil">Cancelar</a>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
