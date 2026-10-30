import { useState } from 'react';
import { PageHeader } from '../components/Layout';
import { TextField } from '../components/TextField';
import { ApiError, errorMessage } from '../services/http';
import { changeMyPassword } from '../services/password';
import {
  confirmationError, currentPasswordError, MESSAGES, passwordPolicyError,
} from '../utils/validation';
import type { PasswordChangeDraft, Session } from '../types';
import '../users.css';

const EMPTY: PasswordChangeDraft = { current: '', next: '', confirm: '' };
type Errors = Partial<Record<keyof PasswordChangeDraft, string>>;

// Orden visual de los campos: sirve para enfocar el primero con error
const FIELD_ORDER: (keyof PasswordChangeDraft)[] = ['current', 'next', 'confirm'];

// Mismas reglas que el back (F-06): el back sigue siendo quien decide.
function validate(d: PasswordChangeDraft): Errors {
  const errors: Errors = {};

  const current = currentPasswordError(d.current);
  if (current) {
    errors.current = current;
  }

  // La nueva contraseña cumple la política y es distinta de la actual
  if (passwordPolicyError(d.next) || (d.next !== '' && d.next === d.current)) {
    errors.next = MESSAGES.newPassword;
  }

  const confirmation = confirmationError(d.next, d.confirm);
  if (confirmation) {
    errors.confirm = confirmation;
  }
  return errors;
}

function focusFirstError(errors: Errors): boolean {
  const first = FIELD_ORDER.find((key) => errors[key]);
  if (first) {
    document.getElementById(first)?.focus();
  }
  return Boolean(first);
}

/**
 * Cambio de contraseña de la persona autenticada (RF-MS01-08, flujo B, F-06). Pide la contraseña actual,
 * la nueva y su confirmación. El token de la sesión sigue siendo válido: el cambio rige para el siguiente
 * inicio de sesión (los Estándares no revocan tokens).
 */
export default function ChangePassword({ session }: { session: Session }) {
  const [form, setForm] = useState<PasswordChangeDraft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState('');

  const set = (key: keyof PasswordChangeDraft, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setServerError('');
  };

  const submit = async () => {
    if (submitting) {
      return;
    }

    const found = validate(form);
    setErrors(found);
    if (focusFirstError(found)) {
      return;
    }

    setSubmitting(true);
    setServerError('');
    try {
      const message = await changeMyPassword(session, form);
      setForm(EMPTY);
      setDone(message);
    } catch (err) {
      if (err instanceof ApiError) {
        const fields: Errors = {
          current: err.fields.current,
          next: err.fields.next,
          confirm: err.fields.confirm,
        };
        setErrors(fields);
        if (!focusFirstError(fields)) {
          setServerError(err.message);
        }
      } else {
        setServerError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  let buttonLabel = 'Cambiar contraseña';
  if (submitting) {
    buttonLabel = 'Cambiando…';
  }

  return (
    <>
      <PageHeader
        badge="MI PERFIL"
        title="Cambiar contraseña"
        subtitle="Escribe tu contraseña actual y elige una nueva. Debe ser distinta de la actual."
      />
      <main className="content narrow">
        {done ? (
          <section className="panel">
            <p className="notice" role="status">{done}</p>
            <a className="btn red" href="#/perfil">Volver al perfil</a>
          </section>
        ) : (
          <form
            className="panel"
            noValidate
            aria-busy={submitting}
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <TextField
              id="current"
              label="Contraseña actual"
              type="password"
              placeholder="Ingresa tu contraseña actual"
              value={form.current}
              onChange={(v) => set('current', v)}
              error={errors.current}
              autoComplete="current-password"
              maxLength={64}
            />
            <TextField
              id="next"
              label="Nueva contraseña"
              type="password"
              placeholder="Ingresa tu nueva contraseña"
              value={form.next}
              onChange={(v) => set('next', v)}
              error={errors.next}
              autoComplete="new-password"
              maxLength={64}
            />
            <TextField
              id="confirm"
              label="Confirmar nueva contraseña"
              type="password"
              placeholder="Ingresa tu nueva contraseña de nuevo"
              value={form.confirm}
              onChange={(v) => set('confirm', v)}
              error={errors.confirm}
              autoComplete="new-password"
              maxLength={64}
            />

            {serverError && <p className="notice err" role="alert">{serverError}</p>}

            <div className="actions">
              <button type="submit" className="btn red" disabled={submitting}>
                {buttonLabel}
              </button>
              <a className="btn white" href="#/perfil">Cancelar</a>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
