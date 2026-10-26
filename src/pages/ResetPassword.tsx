import { useEffect, useState } from 'react';
import { TextField } from '../components/TextField';
import { PasswordError, clearPendingReset, getPendingReset, resetPassword } from '../services/password';
import type { ResetFieldErrors } from '../services/password';
import '../auth.css';

const BACK_ROUTE = '#/recuperar-contrasena';
// Misma política que el back (ResetPasswordRequest)
const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,64}$/;
const POLICY_MESSAGE = 'La contraseña debe tener 8 a 64 caracteres, con mayúscula, minúscula, número y carácter especial.';

export default function ResetPassword() {
  const pending = getPendingReset();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<ResetFieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState('');

  // Sin correo y código no hay nada que restablecer: se vuelve a la pantalla anterior
  useEffect(() => {
    if (!pending && !done) window.location.hash = BACK_ROUTE;
  }, [pending, done]);

  const clear = (key: keyof ResetFieldErrors) => {
    setErrors((c) => ({ ...c, [key]: undefined }));
    setServerError('');
  };

  const submit = async () => {
    if (submitting || !pending) return;

    const found: ResetFieldErrors = {};
    if (!POLICY.test(password)) found.password = POLICY_MESSAGE;
    if (confirm === '' || confirm !== password) found.confirm = 'Las contraseñas no coinciden.';
    setErrors(found);
    if (found.password) return document.getElementById('password')?.focus();
    if (found.confirm) return document.getElementById('confirm')?.focus();

    setSubmitting(true);
    setServerError('');
    try {
      const message = await resetPassword({ ...pending, password, confirm });
      clearPendingReset();
      setDone(message);
    } catch (e) {
      if (!(e instanceof PasswordError)) {
        setServerError('Ocurrió un error inesperado. Intenta de nuevo más tarde.');
      } else if (e.codigo === 'CODIGO_INVALIDO') {
        setServerError(e.message + ' Vuelve atrás para pedir un código nuevo.');
      } else if (e.fields.password || e.fields.confirm) {
        setErrors(e.fields);
      } else {
        setServerError(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="reg login recover">
        <main className="reg-main">
          <img className="login-logo" src="/logo.svg" alt="CampusSeguro" />
          <div className="reg-done">
            <h1>¡Contraseña actualizada!</h1>
            <p>{done}</p>
            <a className="btn red" href="#/login">Iniciar sesión</a>
          </div>
        </main>
        <div className="reg-photo" aria-hidden="true"><img src="/campus.jpg" alt="" /></div>
      </div>
    );
  }

  return (
    <div className="reg login recover">
      <main className="reg-main">
        <img className="login-logo" src="/logo.svg" alt="CampusSeguro" />

        <h1>Cambia tu contraseña</h1>
        <p className="reg-sub">Crea una nueva contraseña para proteger el acceso a tu cuenta.</p>

        <form
          className="reg-form"
          noValidate
          aria-busy={submitting}
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          <TextField
            id="password"
            label="Nueva contraseña"
            type="password"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(v) => { setPassword(v); clear('password'); }}
            error={errors.password}
            autoComplete="new-password"
            maxLength={64}
          />

          <TextField
            id="confirm"
            label="Vuelve a ingresar la contraseña"
            type="password"
            placeholder="Ingresa tu contraseña de nuevo"
            value={confirm}
            onChange={(v) => { setConfirm(v); clear('confirm'); }}
            error={errors.confirm}
            autoComplete="new-password"
            maxLength={64}
          />

          {serverError && <p className="notice err" role="alert">{serverError}</p>}

          <button type="submit" className="btn red" disabled={submitting}>
            {submitting ? 'Cambiando…' : 'Cambiar contraseña'}
          </button>
          <a className="login-forgot" href={BACK_ROUTE}>Volver</a>
        </form>
      </main>

      <div className="reg-photo" aria-hidden="true">
        <img src="/campus.jpg" alt="" />
      </div>
    </div>
  );
}
