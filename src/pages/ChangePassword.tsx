import { useState } from 'react';
import { PageHeader } from '../components/Layout';
import { TextField } from '../components/TextField';
import { PasswordError, changePassword } from '../services/password';
import type { ResetFieldErrors } from '../services/password';
import type { Session } from '../types';
import '../users.css';

// Misma política que el back (ChangePasswordRequest): el back sigue siendo quien decide.
const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,64}$/;
const POLICY_MESSAGE = 'La contraseña debe tener 8 a 64 caracteres, con mayúscula, minúscula, número y carácter especial.';

type Field = 'current' | 'password' | 'confirm';
const ORDER: Field[] = ['current', 'password', 'confirm'];
const IDS: Record<Field, string> = { current: 'current', password: 'password', confirm: 'confirm' };

const focusFirst = (errs: ResetFieldErrors) => {
  const first = ORDER.find((k) => errs[k]);
  if (first) document.getElementById(IDS[first])?.focus();
  return !!first;
};

export default function ChangePassword({ session }: { session: Session }) {
  const [form, setForm] = useState({ current: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<ResetFieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState('');

  const set = (key: Field, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setServerError('');
  };

  const submit = async () => {
    if (submitting) return;

    const found: ResetFieldErrors = {};
    if (form.current === '') found.current = 'Ingrese su contraseña actual.';
    if (!POLICY.test(form.password)) found.password = POLICY_MESSAGE;
    else if (form.password === form.current) found.password = 'La nueva contraseña debe ser distinta de la actual.';
    if (form.confirm === '' || form.confirm !== form.password) found.confirm = 'Las contraseñas no coinciden.';
    setErrors(found);
    if (focusFirst(found)) return;

    setSubmitting(true);
    setServerError('');
    try {
      setDone(await changePassword(session, form));
      setForm({ current: '', password: '', confirm: '' });
    } catch (err) {
      if (err instanceof PasswordError) {
        setErrors(err.fields);
        if (!focusFirst(err.fields)) setServerError(err.message);
      } else {
        setServerError('Ocurrió un error inesperado. Intenta de nuevo más tarde.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        badge="MI PERFIL"
        title="Cambiar contraseña"
        subtitle="Ingresa tu contraseña actual y elige una nueva para proteger el acceso a tu cuenta."
      />
      <main className="content narrow">
        <form
          className="panel"
          noValidate
          aria-busy={submitting}
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          <TextField id="current" label="Contraseña actual" type="password"
            placeholder="Ingresa tu contraseña actual" value={form.current}
            onChange={(v) => set('current', v)} error={errors.current}
            autoComplete="current-password" maxLength={64} />
          <TextField id="password" label="Nueva contraseña" type="password"
            placeholder="Ingresa tu nueva contraseña" value={form.password}
            onChange={(v) => set('password', v)} error={errors.password}
            hint="8 a 64 caracteres, con mayúscula, minúscula, número y carácter especial."
            autoComplete="new-password" maxLength={64} />
          <TextField id="confirm" label="Confirmar nueva contraseña" type="password"
            placeholder="Ingresa tu nueva contraseña de nuevo" value={form.confirm}
            onChange={(v) => set('confirm', v)} error={errors.confirm}
            autoComplete="new-password" maxLength={64} />

          {done && <p className="notice" role="status">{done}</p>}
          {serverError && <p className="notice err" role="alert">{serverError}</p>}

          <div className="actions">
            <button type="submit" className="btn red wide" disabled={submitting}>
              {submitting ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
            <a className="btn white" href="#/perfil">{done ? 'Volver al perfil' : 'Cancelar'}</a>
          </div>
        </form>
      </main>
    </>
  );
}
