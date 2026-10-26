import { useState } from 'react';
import { TextField } from '../components/TextField';
import { ApiError, loginUser } from '../services/identity';
import type { FieldErrors } from '../services/identity';
import { saveSession } from '../services/session';
import type { LoginDraft } from '../types';
import '../auth.css';

const EMPTY: LoginDraft = {
  email: '',
  password: '',
};

type Errors = Pick<FieldErrors, 'email' | 'password'>;

// Destino después de iniciar sesión: la pantalla de simulacro activo
const HOME_ROUTE = '#/simulacro';

// Formato de correo válido (F-02). No se exige el dominio institucional: eso lo decide el back.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Orden visual de los campos: sirve para enfocar el primero con error
const FIELD_ORDER: (keyof Errors)[] = ['email', 'password'];

// Mismas reglas que el back (LoginRequest): el back sigue siendo quien decide.
function validate(d: LoginDraft): Errors {
  const errors: Errors = {};

  // RG-01: el correo se recorta antes de validar
  const email = d.email.trim();
  if (!EMAIL_FORMAT.test(email) || email.length > 100) {
    errors.email = 'Ingrese un correo válido.';
  }

  // RG-02: vacío o solo espacios es faltante. RG-01: la contraseña no se recorta ni se revalida.
  if (d.password.trim() === '') {
    errors.password = 'Ingrese su contraseña.';
  } else if (d.password.length > 64) {
    errors.password = 'La contraseña no puede superar los 64 caracteres.';
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

export default function Login() {
  const [form, setForm] = useState<LoginDraft>(EMPTY);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof LoginDraft, value: string) => {
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
      const session = await loginUser(form);
      saveSession(session, remember);
      window.location.hash = HOME_ROUTE;
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        if (!focusFirstError(err.fields)) {
          setServerError(err.message);
        }
      } else {
        setServerError('Ocurrió un error inesperado. Intenta de nuevo más tarde.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  let buttonLabel = 'Iniciar sesión';
  if (submitting) {
    buttonLabel = 'Iniciando sesión…';
  }

  return (
    <div className="reg login">
      <main className="reg-main">
        <img className="login-logo" src="/logo.svg" alt="CampusSeguro" />

        <h1>¡Qué bueno verte de nuevo!</h1>
        <p className="reg-sub">
          ¿Aún no tienes cuenta? <a href="#/registro">Regístrate</a>
        </p>

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
            id="email"
            label="Correo institucional"
            type="email"
            placeholder="Ingresa tu correo institucional"
            value={form.email}
            onChange={(v) => set('email', v)}
            error={errors.email}
            autoComplete="username"
            maxLength={100}
          />

          <TextField
            id="password"
            label="Contraseña"
            type="password"
            placeholder="Ingresa tu contraseña"
            value={form.password}
            onChange={(v) => set('password', v)}
            error={errors.password}
            autoComplete="current-password"
            maxLength={64}
          />

          <label className="remember">
            <span>Recuérdame</span>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
          </label>

          <a className="login-forgot" href="#/recuperar-contrasena">¿Olvidaste tu contraseña?</a>

          {serverError && (
            <p className="notice err" role="alert">{serverError}</p>
          )}

          <button type="submit" className="btn red" disabled={submitting}>
            {buttonLabel}
          </button>
        </form>
      </main>

      <div className="reg-photo" aria-hidden="true">
        <img src="/login-campus.jpg" alt="" />
      </div>
    </div>
  );
}
