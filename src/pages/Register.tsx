import { useState } from 'react';
import { Logo } from '../components/Logo';
import { TextField } from '../components/TextField';
import { ApiError, registerUser } from '../services/identity';
import { errorMessage } from '../services/http';
import {
  confirmationError, nameError, passwordPolicyError, registerEmailError,
} from '../utils/validation';
import type { RegisterDraft } from '../types';
import '../auth.css';

const EMPTY: RegisterDraft = {
  firstName: '', secondName: '', firstLastName: '', secondLastName: '',
  email: '', password: '', confirmPassword: '',
};
type Errors = Partial<Record<keyof RegisterDraft, string>>;

// Orden visual de los campos: sirve para enfocar el primero con error
const FIELD_ORDER: (keyof RegisterDraft)[] = [
  'email', 'firstName', 'secondName', 'firstLastName', 'secondLastName', 'password', 'confirmPassword',
];

// Mismas reglas y mensajes que el back (F-01): el back sigue siendo quien decide.
function validate(d: RegisterDraft): Errors {
  const e: Errors = {};

  const email = registerEmailError(d.email);
  if (email) e.email = email;

  const firstName = nameError('firstName', d.firstName);
  if (firstName) e.firstName = firstName;
  const secondName = nameError('secondName', d.secondName);
  if (secondName) e.secondName = secondName;
  const firstLastName = nameError('firstLastName', d.firstLastName);
  if (firstLastName) e.firstLastName = firstLastName;
  const secondLastName = nameError('secondLastName', d.secondLastName);
  if (secondLastName) e.secondLastName = secondLastName;

  const password = passwordPolicyError(d.password);
  if (password) e.password = password;

  const confirmation = confirmationError(d.password, d.confirmPassword);
  if (confirmation) e.confirmPassword = confirmation;
  return e;
}

const focusField = (errs: Errors) => {
  const first = FIELD_ORDER.find((k) => errs[k]);
  if (first) document.getElementById(first)?.focus();
  return !!first;
};

export default function Register() {
  const [form, setForm] = useState<RegisterDraft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdEmail, setCreatedEmail] = useState('');

  const set = <K extends keyof RegisterDraft>(k: K, v: RegisterDraft[K]) => {
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
      await registerUser(form);
      setCreatedEmail(form.email.trim().toLowerCase());
      setForm(EMPTY);
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
    <div className="reg">
      <main className="reg-main">
        <Logo className="reg-logo" />

        {createdEmail ? (
          <section className="reg-done" role="status">
            <h1>¡Cuenta creada!</h1>
            <p>
              Registramos la cuenta <b>{createdEmail}</b>. Ya puedes iniciar sesión con este correo y tu contraseña.
            </p>
            <a className="btn red" href="#/login">Iniciar sesión</a>
          </section>
        ) : (
          <>
            <h1>Bienvenido a CampusSeguro</h1>
            <p className="reg-sub">¿Ya tienes una cuenta? <a href="#/login">Inicia sesión</a></p>

            <form
              className="reg-form"
              noValidate
              aria-busy={submitting}
              onSubmit={(e) => { e.preventDefault(); void submit(); }}
            >
              <TextField id="email" label="Correo institucional" type="email"
                placeholder="Ingresa tu correo institucional" value={form.email}
                onChange={(v) => set('email', v)} error={errors.email} autoComplete="email" maxLength={100} />

              <div className="two">
                <TextField id="firstName" label="Primer nombre"
                  placeholder="Ingresa tu primer nombre" value={form.firstName}
                  onChange={(v) => set('firstName', v)} error={errors.firstName}
                  autoComplete="given-name" maxLength={30} />
                <TextField id="secondName" label="Segundo nombre" optional
                  placeholder="Ingresa tu segundo nombre" value={form.secondName}
                  onChange={(v) => set('secondName', v)} error={errors.secondName}
                  autoComplete="additional-name" maxLength={30} />
              </div>
              <div className="two">
                <TextField id="firstLastName" label="Primer apellido"
                  placeholder="Ingresa tu primer apellido" value={form.firstLastName}
                  onChange={(v) => set('firstLastName', v)} error={errors.firstLastName}
                  autoComplete="family-name" maxLength={30} />
                <TextField id="secondLastName" label="Segundo apellido" optional
                  placeholder="Ingresa tu segundo apellido" value={form.secondLastName}
                  onChange={(v) => set('secondLastName', v)} error={errors.secondLastName}
                  maxLength={30} />
              </div>

              <TextField id="password" label="Contraseña" type="password"
                placeholder="Ingresa tu contraseña" value={form.password}
                onChange={(v) => set('password', v)} error={errors.password}
                autoComplete="new-password" maxLength={64} />
              <TextField id="confirmPassword" label="Vuelve a ingresar la contraseña" type="password"
                placeholder="Ingresa tu contraseña de nuevo" value={form.confirmPassword}
                onChange={(v) => set('confirmPassword', v)} error={errors.confirmPassword}
                autoComplete="new-password" maxLength={64} />

              {serverError && <p className="notice err" role="alert">{serverError}</p>}

              <button type="submit" className="btn red" disabled={submitting}>
                {submitting ? 'Creando cuenta…' : 'Regístrate'}
              </button>
            </form>
          </>
        )}
      </main>

      <div className="reg-photo" aria-hidden="true">
        <img src="/campus.jpg" alt="" />
      </div>
    </div>
  );
}
