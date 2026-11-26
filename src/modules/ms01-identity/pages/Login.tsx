import { Mensaje } from '../../../shared/components/Mensaje';
import { useEffect, useState } from 'react';
import { Campo } from '../../../shared/components/Campo';
import { ApiError, loginUser } from '../services/identity';
import { errorMessage } from '../../../shared/services/http';
import { clearRecovery } from '../services/recovery';
import { HOME_ROUTE, saveSession, takeSessionNotice } from '../../../shared/services/session';
import { emailFormatError, loginPasswordError } from '../utils/validation';
import type { LoginDraft } from '../types';
import { Marca } from '../components/Marca';
import '../styles/auth.css';

const EMPTY: LoginDraft = {
  email: '',
  password: '',
};

type Errors = Partial<Record<keyof LoginDraft, string>>;

// Orden visual de los campos: sirve para enfocar el primero con error
const FIELD_ORDER: (keyof Errors)[] = ['email', 'password'];

// Mismas reglas que el back (LoginRequest): el back sigue siendo quien decide.
// RG-01: el correo se recorta antes de validar; la contraseña no se recorta ni se revalida (RG-02: vacía es faltante).
// No se exige el dominio institucional: eso lo decide el back.
function validate(d: LoginDraft): Errors {
  const errors: Errors = {};

  const email = emailFormatError(d.email);
  if (email) {
    errors.email = email;
  }

  const password = loginPasswordError(d.password);
  if (password) {
    errors.password = password;
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
  // Aviso de la pantalla anterior: "Sesión cerrada.", "Tu sesión venció...", "Contraseña actualizada."
  const [notice] = useState(takeSessionNotice);

  // Llegar al inicio de sesión descarta cualquier recuperación de contraseña a medias
  useEffect(() => {
    clearRecovery();
  }, []);

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
        setServerError(errorMessage(err));
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
        <Marca />

        <h1>¡Qué bueno verlo de nuevo!</h1>
        <p className="reg-sub">
          ¿Aún no tiene cuenta? <a href="#/registro">Regístrese</a>
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
          {notice && <Mensaje tono="info">{notice}</Mensaje>}

          <Campo
            id="email"
            label="Correo institucional"
            type="email"
            placeholder="Ingrese su correo institucional"
            value={form.email}
            onChange={(v) => set('email', v)}
            error={errors.email}
            autoComplete="username"
            maxLength={100}
          />

          <Campo
            id="password"
            label="Contraseña"
            type="password"
            placeholder="Ingrese su contraseña"
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

          <a className="login-forgot" href="#/recuperar-contrasena">¿Olvidó su contraseña?</a>

          {serverError && (
            <Mensaje tono="error">{serverError}</Mensaje>
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
