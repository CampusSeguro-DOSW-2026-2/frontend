import { useEffect, useState } from 'react';
import { CodeInput } from '../components/CodeInput';
import { TextField } from '../components/TextField';
import { ApiError, errorMessage } from '../services/http';
import { requestPasswordCode } from '../services/password';
import { clearRecovery, readRecovery, RESEND_SECONDS, saveRecovery } from '../services/recovery';
import { codeError, emailFormatError } from '../utils/validation';
import '../auth.css';

// Ruta de la pantalla donde se escribe la nueva contraseña (F-05)
const RESET_ROUTE = '#/cambiar-contrasena';

type Step = 'email' | 'code';

/**
 * Recuperación de contraseña (RF-MS01-08, flujo A), primera parte. Primero se pide el correo (F-04) y el
 * sistema responde siempre lo mismo exista o no la cuenta; luego se escribe el código de 6 dígitos que
 * llegó al correo y se pasa a elegir la nueva contraseña (F-05).
 */
export default function ForgotPassword() {
  // Si se vuelve desde la pantalla de la nueva contraseña (código vencido, por ejemplo), se retoma en el código
  const [saved] = useState(readRecovery);
  const [step, setStep] = useState<Step>(saved ? 'code' : 'email');
  const [email, setEmail] = useState(saved?.email ?? '');
  const [code, setCode] = useState(saved?.code ?? '');
  const [emailErr, setEmailErr] = useState('');
  const [codeErr, setCodeErr] = useState(saved?.error ?? '');
  const [info, setInfo] = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Espera entre dos solicitudes de código (la misma que aplica MS01): instante en que termina y reloj de la pantalla
  const [waitUntil, setWaitUntil] = useState(saved?.waitUntil ?? 0);
  const [now, setNow] = useState(Date.now);
  const remaining = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  // Cuenta regresiva del botón de reenviar: el reloj solo corre mientras hay espera
  useEffect(() => {
    if (waitUntil <= Date.now()) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= waitUntil) {
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [waitUntil]);

  // Al volver con el código pendiente, el cursor queda en la casilla del código
  useEffect(() => {
    if (saved) {
      document.getElementById('code')?.focus();
    }
  }, [saved]);

  const onEmail = (value: string) => {
    setEmail(value);
    setEmailErr('');
    setServerError('');
    // La espera es de la cuenta a la que se pidió el código: con otro correo se puede pedir de inmediato
    setWaitUntil(0);
  };

  const onCode = (value: string) => {
    setCode(value);
    setCodeErr('');
    setServerError('');
  };

  // F-04: solicita el código. La respuesta es la misma exista o no el correo (RN-MS01-20)
  const requestCode = async (): Promise<boolean> => {
    const problem = emailFormatError(email);
    setEmailErr(problem);
    if (problem) {
      document.getElementById('email')?.focus();
      return false;
    }

    setSubmitting(true);
    setServerError('');
    setInfo('');
    try {
      const message = await requestPasswordCode(email);
      setInfo(message);
      const started = Date.now();
      setNow(started);
      setWaitUntil(started + RESEND_SECONDS * 1000);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.fields.email) {
        setEmailErr(err.fields.email);
        document.getElementById('email')?.focus();
      } else {
        setServerError(errorMessage(err));
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (submitting) {
      return;
    }

    if (step === 'email') {
      clearRecovery();
      if (await requestCode()) {
        setCode('');
        setCodeErr('');
        setStep('code');
        // Con la casilla del código a la vista, el cursor queda listo para escribirlo
        window.setTimeout(() => document.getElementById('code')?.focus(), 0);
      }
      return;
    }

    // F-05: el código se valida junto con la nueva contraseña en la pantalla siguiente
    const emailProblem = emailFormatError(email);
    const codeProblem = codeError(code);
    setEmailErr(emailProblem);
    setCodeErr(codeProblem);
    if (emailProblem) {
      document.getElementById('email')?.focus();
      return;
    }
    if (codeProblem) {
      document.getElementById('code')?.focus();
      return;
    }
    saveRecovery(email.trim().toLowerCase(), code, '', waitUntil);
    window.location.hash = RESET_ROUTE;
  };

  const resend = async () => {
    if (submitting || remaining > 0) {
      return;
    }
    if (await requestCode()) {
      setCode('');
      setCodeErr('');
      window.setTimeout(() => document.getElementById('code')?.focus(), 0);
    }
  };

  let buttonLabel = 'Restablecer contraseña';
  if (submitting && step === 'email') {
    buttonLabel = 'Enviando código…';
  }

  let resendLabel = 'Reenviar código';
  if (remaining > 0) {
    resendLabel = `Reenviar código en ${remaining} s`;
  }

  return (
    <div className="reg login">
      <main className="reg-main">
        <img className="login-logo" src="/logo.svg" alt="CampusSeguro" />

        <h1>¿Olvidaste tu contraseña?</h1>
        <p className="reg-sub">No te preocupes. Ingresa tu correo y te ayudaremos a recuperar tu acceso.</p>

        <form
          className="reg-form"
          noValidate
          aria-busy={submitting}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {info && <p className="notice" role="status">{info}</p>}

          <TextField
            id="email"
            label="Correo institucional"
            type="email"
            placeholder="Ingresa tu correo institucional"
            value={email}
            onChange={onEmail}
            error={emailErr}
            autoComplete="username"
            maxLength={100}
          />

          {step === 'code' && (
            <CodeInput
              id="code"
              label="Código"
              value={code}
              onChange={onCode}
              error={codeErr}
              disabled={submitting}
            />
          )}

          {serverError && <p className="notice err" role="alert">{serverError}</p>}

          <button type="submit" className="btn red" disabled={submitting}>
            {buttonLabel}
          </button>

          {step === 'code' && (
            <button
              type="button"
              className="login-forgot link"
              onClick={() => void resend()}
              disabled={submitting || remaining > 0}
            >
              {resendLabel}
            </button>
          )}
          <a className="login-forgot" href="#/login">Volver a iniciar sesión</a>
        </form>
      </main>

      <div className="reg-photo" aria-hidden="true">
        <img src="/recuperar-campus.jpg" alt="" />
      </div>
    </div>
  );
}
