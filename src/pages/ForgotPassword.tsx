import { useEffect, useState } from 'react';
import { CodeInput } from '../components/CodeInput';
import { TextField } from '../components/TextField';
import { PasswordError, requestResetCode, savePendingReset } from '../services/password';
import '../auth.css';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mismo tiempo de espera que el back (campusseguro.recuperacion.espera-segundos)
const RESEND_SECONDS = 60;
const NEXT_ROUTE = '#/restablecer-contrasena';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});
  const [info, setInfo] = useState('');
  const [serverError, setServerError] = useState('');
  const [sending, setSending] = useState(false);
  const [wait, setWait] = useState(0);

  // Cuenta regresiva para poder pedir otro código
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const emailError = () => {
    const v = email.trim();
    return !EMAIL_FORMAT.test(v) || v.length > 100 ? 'Ingrese un correo válido.' : undefined;
  };

  const sendCode = async () => {
    if (sending || wait > 0) return;
    const err = emailError();
    setErrors((c) => ({ ...c, email: err }));
    if (err) {
      document.getElementById('email')?.focus();
      return;
    }
    setSending(true);
    setServerError('');
    setInfo('');
    try {
      setInfo(await requestResetCode(email));
      setWait(RESEND_SECONDS);
      document.getElementById('code-0')?.focus();
    } catch (e) {
      if (e instanceof PasswordError && e.fields.email) {
        setErrors((c) => ({ ...c, email: e.fields.email }));
      } else {
        setServerError(e instanceof PasswordError ? e.message : 'Ocurrió un error inesperado. Intenta de nuevo más tarde.');
      }
    } finally {
      setSending(false);
    }
  };

  const submit = () => {
    const found = { email: emailError(), code: /^\d{6}$/.test(code) ? undefined : 'Ingrese el código de 6 dígitos.' };
    setErrors(found);
    if (found.email) return document.getElementById('email')?.focus();
    if (found.code) return document.getElementById('code-0')?.focus();
    // El código se valida en el back al cambiar la contraseña (siguiente pantalla)
    savePendingReset(email.trim().toLowerCase(), code);
    window.location.hash = NEXT_ROUTE;
  };

  let sendLabel = 'Enviar código';
  if (sending) sendLabel = 'Enviando…';
  else if (wait > 0) sendLabel = `Reenviar código en ${wait} s`;

  return (
    <div className="reg login recover">
      <main className="reg-main">
        <img className="login-logo" src="/logo.svg" alt="CampusSeguro" />

        <h1>¿Olvidaste tu contraseña?</h1>
        <p className="reg-sub">No te preocupes. Ingresa tu correo y te ayudaremos a recuperar tu acceso.</p>

        <form
          className="reg-form"
          noValidate
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <TextField
            id="email"
            label="Correo institucional"
            type="email"
            placeholder="Ingresa tu correo institucional"
            value={email}
            onChange={(v) => { setEmail(v); setErrors((c) => ({ ...c, email: undefined })); setServerError(''); }}
            error={errors.email}
            autoComplete="username"
            maxLength={100}
          />

          <button type="button" className="link-btn" onClick={() => void sendCode()} disabled={sending || wait > 0}>
            {sendLabel}
          </button>

          <CodeInput
            id="code"
            label="Código"
            value={code}
            onChange={(v) => { setCode(v); setErrors((c) => ({ ...c, code: undefined })); }}
            error={errors.code}
          />

          {info && <p className="notice" role="status">{info}</p>}
          {serverError && <p className="notice err" role="alert">{serverError}</p>}

          <button type="submit" className="btn red">Restablecer contraseña</button>
          <a className="login-forgot" href="#/login">Volver a iniciar sesión</a>
        </form>
      </main>

      <div className="reg-photo" aria-hidden="true">
        <img src="/recuperar-campus.jpg" alt="" />
      </div>
    </div>
  );
}
