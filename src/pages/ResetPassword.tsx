import { useEffect, useState } from 'react';
import { TextField } from '../components/TextField';
import { ApiError, errorMessage } from '../services/http';
import { resetPassword } from '../services/password';
import { clearRecovery, readRecovery, saveRecovery } from '../services/recovery';
import { setSessionNotice } from '../services/session';
import { confirmationError, MESSAGES, passwordPolicyError } from '../utils/validation';
import type { PasswordResetDraft } from '../types';
import '../auth.css';

const EMPTY: PasswordResetDraft = { password: '', confirmPassword: '' };
type Errors = Partial<Record<keyof PasswordResetDraft, string>>;

// Orden visual de los campos: sirve para enfocar el primero con error
const FIELD_ORDER: (keyof PasswordResetDraft)[] = ['password', 'confirmPassword'];

const CODE_ROUTE = '#/recuperar-contrasena';
const LOGIN_ROUTE = '#/login';

// Misma política que el back (F-05): el back sigue siendo quien decide.
function validate(d: PasswordResetDraft): Errors {
  const errors: Errors = {};
  const password = passwordPolicyError(d.password);
  if (password) {
    errors.password = password;
  }
  const confirmation = confirmationError(d.password, d.confirmPassword);
  if (confirmation) {
    errors.confirmPassword = confirmation;
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
 * Recuperación de contraseña (RF-MS01-08, flujo A), segunda parte: nueva contraseña (F-05). Se envían juntos
 * el correo, el código de la pantalla anterior y la nueva contraseña con su confirmación. Si el código es
 * incorrecto, venció o ya se usó, se vuelve a la pantalla del código con el mensaje genérico del contrato.
 */
export default function ResetPassword() {
  const [recovery] = useState(readRecovery);
  const [form, setForm] = useState<PasswordResetDraft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sin correo y código (por ejemplo, al abrir esta dirección directamente) no hay nada que restablecer
  const ready = Boolean(recovery?.email && recovery.code);
  useEffect(() => {
    if (!ready) {
      window.location.hash = CODE_ROUTE;
    }
  }, [ready]);

  const set = (key: keyof PasswordResetDraft, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setServerError('');
  };

  const submit = async () => {
    if (submitting || !recovery) {
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
      const message = await resetPassword({
        email: recovery.email,
        code: recovery.code,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      clearRecovery();
      // El éxito obliga a iniciar sesión de nuevo: el aviso se muestra en esa pantalla
      setSessionNotice(message);
      window.location.hash = LOGIN_ROUTE;
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'CODIGO_INVALIDO' || err.fields.code || err.fields.email)) {
        // El código ya no sirve: se vuelve a la pantalla del código sin conservarlo
        saveRecovery(recovery.email, '', MESSAGES.code);
        window.location.hash = CODE_ROUTE;
        return;
      }
      if (err instanceof ApiError) {
        const fields: Errors = {
          password: err.fields.password,
          confirmPassword: err.fields.confirmPassword,
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

  if (!ready) {
    return null;
  }

  let buttonLabel = 'Cambiar contraseña';
  if (submitting) {
    buttonLabel = 'Cambiando contraseña…';
  }

  return (
    <div className="reg login">
      <main className="reg-main">
        <img className="login-logo" src="/logo.svg" alt="CampusSeguro" />

        <h1>Cambia tu contraseña</h1>
        <p className="reg-sub">Crea una nueva contraseña para proteger el acceso a tu cuenta.</p>

        <form
          className="reg-form"
          noValidate
          aria-busy={submitting}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <TextField
            id="password"
            label="Nueva contraseña"
            type="password"
            placeholder="Ingresa tu contraseña"
            value={form.password}
            onChange={(v) => set('password', v)}
            error={errors.password}
            autoComplete="new-password"
            maxLength={64}
          />

          <TextField
            id="confirmPassword"
            label="Vuelve a ingresar la contraseña"
            type="password"
            placeholder="Ingresa tu contraseña de nuevo"
            value={form.confirmPassword}
            onChange={(v) => set('confirmPassword', v)}
            error={errors.confirmPassword}
            autoComplete="new-password"
            maxLength={64}
          />

          {serverError && <p className="notice err" role="alert">{serverError}</p>}

          <button type="submit" className="btn red" disabled={submitting}>
            {buttonLabel}
          </button>

          <a className="login-forgot" href={LOGIN_ROUTE}>Volver a iniciar sesión</a>
        </form>
      </main>

      <div className="reg-photo" aria-hidden="true">
        <img src="/cambiar-campus.jpg" alt="" />
      </div>
    </div>
  );
}
