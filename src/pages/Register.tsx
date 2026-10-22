import { useState } from 'react';
import { PageHeader } from '../components/Layout';
import { TextField } from '../components/TextField';
import { Check, Lock, Mail } from '../components/Icons';
import { ApiError, registerUser } from '../services/identity';
import type { RegisterDraft } from '../types';
import '../auth.css';

const EMPTY: RegisterDraft = {
  firstName: '', secondName: '', firstLastName: '', secondLastName: '',
  email: '', password: '', confirmPassword: '',
};
type Errors = Partial<Record<keyof RegisterDraft, string>>;

// Orden visual de los campos: sirve para enfocar el primero con error
const FIELD_ORDER: (keyof RegisterDraft)[] = [
  'firstName', 'secondName', 'firstLastName', 'secondLastName', 'email', 'password', 'confirmPassword',
];

// Mismas reglas que el back (UserCreateRequest): el back sigue siendo quien decide.
const INSTITUTIONAL = /^[A-Za-z0-9._%+-]+@(mail\.)?escuelaing\.edu\.co$/i;

function validate(d: RegisterDraft): Errors {
  const e: Errors = {};
  const req = 'Campo obligatorio';
  const range = 'Debe tener entre 2 y 30 caracteres';
  const okLen = (v: string) => v.trim().length >= 2 && v.trim().length <= 30;

  if (!d.firstName.trim()) e.firstName = req; else if (!okLen(d.firstName)) e.firstName = range;
  if (d.secondName.trim() && !okLen(d.secondName)) e.secondName = range;
  if (!d.firstLastName.trim()) e.firstLastName = req; else if (!okLen(d.firstLastName)) e.firstLastName = range;
  if (d.secondLastName.trim() && !okLen(d.secondLastName)) e.secondLastName = range;

  const email = d.email.trim();
  if (!email) e.email = req;
  else if (email.length > 100) e.email = 'No puede superar los 100 caracteres';
  else if (!INSTITUTIONAL.test(email)) e.email = 'Usa tu correo institucional (@escuelaing.edu.co o @mail.escuelaing.edu.co)';

  if (!d.password) e.password = req;
  else if (d.password.length < 8 || d.password.length > 72) e.password = 'Debe tener entre 8 y 72 caracteres';

  if (!d.confirmPassword) e.confirmPassword = req;
  else if (d.confirmPassword !== d.password) e.confirmPassword = 'Las contraseñas no coinciden';
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
        setServerError('Ocurrió un error inesperado. Intenta de nuevo más tarde.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <PageHeader
      badge="REGISTRO"
      title="Crear cuenta"
      subtitle="Regístrate con tu correo institucional para acceder a CampusSeguro."
    />
  );

  if (createdEmail) {
    return (
      <>
        {header}
        <main className="auth">
          <section className="auth-card done" role="status">
            <span className="okmark"><Check /></span>
            <h2>¡Cuenta creada!</h2>
            <p>
              Registramos la cuenta <b>{createdEmail}</b>. Cuando el inicio de sesión esté disponible,
              podrás ingresar con este correo y tu contraseña.
            </p>
            <div className="actions">
              <a className="btn red" href="#/">Ir al inicio</a>
              <button type="button" className="btn white" onClick={() => setCreatedEmail('')}>Registrar otra cuenta</button>
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      {header}
      <main className="auth">
        <form
          className="auth-card"
          noValidate
          aria-busy={submitting}
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          <h2>Datos personales</h2>
          <div className="two">
            <TextField id="firstName" label="Primer nombre" required value={form.firstName}
              onChange={(v) => set('firstName', v)} error={errors.firstName} autoComplete="given-name" maxLength={30} />
            <TextField id="secondName" label="Segundo nombre" value={form.secondName}
              onChange={(v) => set('secondName', v)} error={errors.secondName} autoComplete="additional-name" maxLength={30} />
          </div>
          <div className="two">
            <TextField id="firstLastName" label="Primer apellido" required value={form.firstLastName}
              onChange={(v) => set('firstLastName', v)} error={errors.firstLastName} autoComplete="family-name" maxLength={30} />
            <TextField id="secondLastName" label="Segundo apellido" value={form.secondLastName}
              onChange={(v) => set('secondLastName', v)} error={errors.secondLastName} maxLength={30} />
          </div>

          <h2>Acceso</h2>
          <TextField id="email" label="Correo institucional" required type="email" icon={<Mail />}
            value={form.email} onChange={(v) => set('email', v)} error={errors.email}
            hint="Usa tu correo @escuelaing.edu.co o @mail.escuelaing.edu.co" autoComplete="email" maxLength={100} />
          <div className="two">
            <TextField id="password" label="Contraseña" required type="password" icon={<Lock />}
              value={form.password} onChange={(v) => set('password', v)} error={errors.password}
              hint="Entre 8 y 72 caracteres" autoComplete="new-password" maxLength={72} />
            <TextField id="confirmPassword" label="Confirmar contraseña" required type="password" icon={<Lock />}
              value={form.confirmPassword} onChange={(v) => set('confirmPassword', v)} error={errors.confirmPassword}
              autoComplete="new-password" maxLength={72} />
          </div>

          {serverError && <p className="notice err" role="alert">{serverError}</p>}

          <div className="actions">
            <button type="submit" className="btn red" disabled={submitting}>
              {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
            <button type="button" className="btn white" disabled={submitting}
              onClick={() => { setForm(EMPTY); setErrors({}); setServerError(''); }}>
              Limpiar formulario
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
