import { useEffect, useState } from 'react';
import { CodeInput } from '../components/CodeInput';
import { Marca } from '../components/Marca';
import { Campo } from '../../../shared/components/Campo';
import {
  ApiError, REGISTRATION_RESEND_SECONDS, registerUser, resendRegistrationCode, verifyRegistration,
} from '../services/identity';
import { errorMessage } from '../../../shared/services/http';
import {
  codeError, confirmationError, nameError, passwordPolicyError, registerEmailError,
} from '../utils/validation';
import type { RegisterDraft } from '../types';
import '../styles/auth.css';

const EMPTY: RegisterDraft = {
  firstName: '', secondName: '', firstLastName: '', secondLastName: '',
  email: '', password: '', confirmPassword: '',
};
type Errors = Partial<Record<keyof RegisterDraft, string>>;

// Pasos del registro (RF-MS01-01): datos (F-01), código del correo (F-14) y cuenta creada
type Step = 'form' | 'code' | 'done';

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

/**
 * Registro de un usuario institucional (RF-MS01-01). Con los datos válidos MS01 envía un código de 6 dígitos al
 * correo (202) y la cuenta solo se crea cuando ese código se confirma (F-14), así no quedan cuentas de correos que no
 * existen. El código se puede reenviar con la misma espera que aplica MS01.
 */
export default function Register() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<RegisterDraft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Paso del código: correo que se verifica, token del registro (solo en memoria), código escrito, su error y el aviso
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [info, setInfo] = useState('');
  // Espera entre dos códigos del mismo correo: instante en que termina y reloj de la pantalla
  const [waitUntil, setWaitUntil] = useState(0);
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

  const startWait = () => {
    const started = Date.now();
    setNow(started);
    setWaitUntil(started + REGISTRATION_RESEND_SECONDS * 1000);
  };

  const set = <K extends keyof RegisterDraft>(k: K, v: RegisterDraft[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
    setServerError('');
  };

  const onCode = (value: string) => {
    setCode(value);
    setCodeErr('');
    setServerError('');
  };

  // Paso 1 (F-01): datos del registro. MS01 responde 202 y envía el código; la cuenta todavía no existe
  const submitForm = async () => {
    const e = validate(form);
    setErrors(e);
    if (focusField(e)) return;

    setSubmitting(true);
    setServerError('');
    try {
      const { message, token: registrationToken } = await registerUser(form);
      setEmail(form.email.trim().toLowerCase());
      setToken(registrationToken);
      setForm(EMPTY);
      setCode('');
      setCodeErr('');
      setInfo(message);
      startWait();
      setStep('code');
      window.setTimeout(() => document.getElementById('code')?.focus(), 0);
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

  // Paso 2 (F-14): confirmar el código. Con el código correcto MS01 crea la cuenta (201)
  const submitCode = async () => {
    const problem = codeError(code);
    setCodeErr(problem);
    if (problem) {
      document.getElementById('code')?.focus();
      return;
    }

    setSubmitting(true);
    setServerError('');
    try {
      await verifyRegistration(email, code, token);
      setStep('done');
    } catch (err) {
      if (err instanceof ApiError && err.fields.code) {
        setCodeErr(err.fields.code);
        setCode('');
        document.getElementById('code')?.focus();
      } else {
        setServerError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (submitting) return;
    if (step === 'form') {
      await submitForm();
    } else if (step === 'code') {
      await submitCode();
    }
  };

  // Flujo alterno A1: un código nuevo reemplaza al anterior; la respuesta es la misma exista o no el registro
  const resend = async () => {
    if (submitting || remaining > 0) return;
    setSubmitting(true);
    setServerError('');
    try {
      setInfo(await resendRegistrationCode(email, token));
      setCode('');
      setCodeErr('');
      startWait();
      window.setTimeout(() => document.getElementById('code')?.focus(), 0);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Volver a los datos: un registro nuevo con el mismo correo reemplaza al pendiente
  const backToForm = () => {
    setStep('form');
    setServerError('');
    setInfo('');
    setForm({ ...EMPTY, email });
  };

  let resendLabel = 'Reenviar código';
  if (remaining > 0) {
    resendLabel = `Reenviar código en ${remaining} s`;
  }

  return (
    <div className="reg">
      <main className="reg-main">
        <Marca />

        {step === 'done' && (
          <section className="reg-done" role="status">
            <h1>¡Cuenta creada!</h1>
            <p>
              Verificamos el correo <b>{email}</b> y creamos la cuenta. Inicie sesión con este correo y su contraseña.
            </p>
            <a className="btn red" href="#/login">Iniciar sesión</a>
          </section>
        )}

        {step === 'code' && (
          <>
            <h1>Verifique su correo</h1>
            <p className="reg-sub">
              Ingrese el código de 6 dígitos que enviamos a <b>{email}</b>. La cuenta se crea al confirmarlo.
            </p>

            <form
              className="reg-form"
              noValidate
              aria-busy={submitting}
              onSubmit={(e) => { e.preventDefault(); void submit(); }}
            >
              {info && <p className="notice" role="status">{info}</p>}

              <CodeInput id="code" label="Código de verificación" value={code} onChange={onCode}
                error={codeErr} disabled={submitting} />

              {serverError && <p className="notice err" role="alert">{serverError}</p>}

              <button type="submit" className="btn red" disabled={submitting}>
                {submitting ? 'Verificando…' : 'Crear cuenta'}
              </button>

              <button type="button" className="login-forgot link" onClick={() => void resend()}
                disabled={submitting || remaining > 0}>
                {resendLabel}
              </button>
              <button type="button" className="login-forgot link" onClick={backToForm} disabled={submitting}>
                Corregir los datos del registro
              </button>
            </form>
          </>
        )}

        {step === 'form' && (
          <>
            <h1>Cree su cuenta</h1>
            <p className="reg-sub">¿Ya tiene una cuenta? <a href="#/login">Inicie sesión</a></p>

            <form
              className="reg-form"
              noValidate
              aria-busy={submitting}
              onSubmit={(e) => { e.preventDefault(); void submit(); }}
            >
              <Campo id="email" label="Correo institucional" type="email"
                placeholder="Ingrese su correo institucional" value={form.email}
                onChange={(v) => set('email', v)} error={errors.email} autoComplete="email" maxLength={100} />

              <div className="two">
                <Campo id="firstName" label="Primer nombre"
                  placeholder="Ingrese su primer nombre" value={form.firstName}
                  onChange={(v) => set('firstName', v)} error={errors.firstName}
                  autoComplete="given-name" maxLength={30} />
                <Campo id="secondName" label="Segundo nombre" optional
                  placeholder="Ingrese su segundo nombre" value={form.secondName}
                  onChange={(v) => set('secondName', v)} error={errors.secondName}
                  autoComplete="additional-name" maxLength={30} />
              </div>
              <div className="two">
                <Campo id="firstLastName" label="Primer apellido"
                  placeholder="Ingrese su primer apellido" value={form.firstLastName}
                  onChange={(v) => set('firstLastName', v)} error={errors.firstLastName}
                  autoComplete="family-name" maxLength={30} />
                <Campo id="secondLastName" label="Segundo apellido" optional
                  placeholder="Ingrese su segundo apellido" value={form.secondLastName}
                  onChange={(v) => set('secondLastName', v)} error={errors.secondLastName}
                  maxLength={30} />
              </div>

              <Campo id="password" label="Contraseña" type="password"
                placeholder="Ingrese su contraseña" value={form.password}
                onChange={(v) => set('password', v)} error={errors.password}
                autoComplete="new-password" maxLength={64} />
              <Campo id="confirmPassword" label="Confirme la contraseña" type="password"
                placeholder="Ingrese de nuevo su contraseña" value={form.confirmPassword}
                onChange={(v) => set('confirmPassword', v)} error={errors.confirmPassword}
                autoComplete="new-password" maxLength={64} />

              {serverError && <p className="notice err" role="alert">{serverError}</p>}

              <button type="submit" className="btn red" disabled={submitting}>
                {submitting ? 'Enviando código…' : 'Registrarse'}
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
