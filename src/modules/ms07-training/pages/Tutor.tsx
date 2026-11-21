import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { ApiError, errorMessage } from '../../../shared/services/http';
import type { Session } from '../../../shared/types';
import { trainingApi } from '../services/training';
import type { FuenteTutor } from '../types';
import { respuestaLocal } from '../utils/tutorLocal';
import '../styles/tutor.css';

/** Largo máximo de una pregunta (RF-15): lo valida también MS07. */
const MAXIMO = 500;
/** A partir de aquí se muestra el contador de caracteres. */
const AVISO_LARGO = 400;
/** Mensajes que se conservan al volver de un contenido (solo en esta pestaña). */
const MAXIMO_GUARDADOS = 50;

const SUGERENCIAS = [
  '¿Qué hago si tiembla mientras estoy en clase?',
  '¿Cómo evacúo un laboratorio de forma segura?',
  '¿Qué debo hacer después de un sismo?',
  '¿Cómo me preparo antes de un sismo?',
];

/**
 * Cuando el tutor no tiene información (pregunta de otro tema o que los contenidos no cubren) no es un error: se
 * explica con amabilidad para qué sirve, se remite al protocolo oficial (RF-15) y se proponen preguntas que sí responde.
 */
const FUERA_DE_ALCANCE =
  'Lo siento, eso no lo puedo responder. Solo le ayudo con la prevención y la actuación ante sismos y otras '
  + 'emergencias en el campus, con base en los contenidos oficiales. Si su duda es sobre una emergencia, consulte el '
  + 'protocolo oficial de emergencias de la ECI o a los brigadistas de su edificio.';

/** Dos preguntas de ejemplo, alternando entre respuestas para no repetir siempre las mismas. */
const ejemplos = (posicion: number) => {
  const inicio = (posicion % 2) * 2;
  return SUGERENCIAS.slice(inicio, inicio + 2);
};

type Mensaje =
  | { id: string; de: 'usuario'; texto: string }
  | { id: string; de: 'tutor'; texto: string; suficiente: boolean; fuentes: FuenteTutor[] }
  | { id: string; de: 'error'; texto: string; pregunta: string };

let contador = 0;
const nuevoId = () => `${Date.now().toString(36)}-${(contador++).toString(36)}`;

// La conversación vive solo en esta pestaña: así no se pierde al abrir una fuente y volver. Nunca sale del navegador.
const claveDe = (session: Session) => `ms07-tutor:${session.user.id}`;

function leer(session: Session): Mensaje[] {
  try {
    const guardado = sessionStorage.getItem(claveDe(session));
    return guardado ? (JSON.parse(guardado) as Mensaje[]) : [];
  } catch {
    return [];
  }
}

function guardar(session: Session, mensajes: Mensaje[]): void {
  try {
    if (mensajes.length === 0) sessionStorage.removeItem(claveDe(session));
    else sessionStorage.setItem(claveDe(session), JSON.stringify(mensajes.slice(-MAXIMO_GUARDADOS)));
  } catch {
    // Sin almacenamiento la conversación sigue funcionando; solo no se conserva al salir de la pantalla
  }
}

/** Mensaje cuando la IA o el servicio no responden a tiempo (503, 504 o sin conexión): siempre se puede reintentar. */
const NO_DISPONIBLE = 'El tutor no está disponible en este momento. Intente de nuevo en unos segundos o consulte el centro de aprendizaje.';

function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError && (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504)) {
    return NO_DISPONIBLE;
  }
  return errorMessage(err);
}

/** El modelo a veces marca negritas con asteriscos: se muestran como texto normal. */
const sinMarcas = (texto: string) => texto.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '');

/** Pausa corta antes de una respuesta local, para que se lea como una conversación y no como un salto. */
const pausa = (ms: number) => new Promise((resolver) => { setTimeout(resolver, ms); });

const prefiereSinMovimiento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const IconoTutor = () => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="M9 11.5h.01M15 11.5h.01M9.5 15a3.5 3.5 0 0 0 5 0" />
  </svg>
);
const IconoEnviar = () => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
);
const IconoLibro = () => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);
const IconoNuevo = () => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
);

/**
 * RF-15 Tutor CampusSeguro: chat con el asistente de IA, que responde solo con los contenidos de capacitación
 * activos. Los saludos y agradecimientos se responden en el navegador (utils/tutorLocal.ts). Cada respuesta enlaza los contenidos usados como fuente. Si no hay información, el tutor remite al
 * protocolo oficial; si la IA no responde, se puede reintentar la misma pregunta.
 */
export default function Tutor({ session }: { session: Session }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => leer(session));
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const registro = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; };
  }, []);

  useEffect(() => { guardar(session, mensajes); }, [session, mensajes]);

  // Siempre se ve lo último: la pregunta enviada, el indicador de escritura o la respuesta
  useEffect(() => {
    const caja = registro.current;
    if (caja && mensajes.length > 0) caja.scrollTo({ top: caja.scrollHeight, behavior: prefiereSinMovimiento() ? 'auto' : 'smooth' });
  }, [mensajes, enviando]);

  // En computador el cursor queda listo para escribir; en celular no se abre el teclado sin que el usuario lo pida
  useEffect(() => {
    if (window.matchMedia?.('(pointer: fine)').matches) campo.current?.focus();
  }, []);

  // El campo crece con el texto hasta unas cinco líneas
  useEffect(() => {
    const area = campo.current;
    if (!area) return;
    area.style.height = 'auto';
    area.style.height = `${Math.min(area.scrollHeight, 160)}px`;
  }, [texto]);

  const preguntar = async (pregunta: string, reintentoDe?: string) => {
    const limpia = pregunta.trim();
    if (!limpia || enviando) return;
    setEnviando(true);
    setMensajes((actuales) => (reintentoDe
      ? actuales.filter((m) => m.id !== reintentoDe)
      : [...actuales, { id: nuevoId(), de: 'usuario', texto: limpia }]));
    if (!reintentoDe) setTexto('');
    try {
      // Fase 1 (Two-Phase): saludos y agradecimientos se responden aquí, sin llamar a MS07 ni a la IA
      const local = respuestaLocal(limpia);
      if (local) {
        await pausa(prefiereSinMovimiento() ? 0 : 450);
        if (!vivo.current) return;
        setMensajes((actuales) => [...actuales, { id: nuevoId(), de: 'tutor', texto: local, suficiente: true, fuentes: [] }]);
        return;
      }
      const respuesta = await trainingApi.preguntarTutor(session, limpia);
      if (!vivo.current) return;
      setMensajes((actuales) => [...actuales, {
        id: nuevoId(), de: 'tutor', texto: sinMarcas(respuesta.answer), suficiente: respuesta.sufficient,
        fuentes: respuesta.sources ?? [],
      }]);
    } catch (err) {
      if (!vivo.current) return;
      setMensajes((actuales) => [...actuales, { id: nuevoId(), de: 'error', texto: mensajeDeError(err), pregunta: limpia }]);
    } finally {
      if (vivo.current) {
        setEnviando(false);
        campo.current?.focus({ preventScroll: true });
      }
    }
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    void preguntar(texto);
  };

  // Enter envía y Shift + Enter hace un salto de línea; no interrumpe a quien escribe con tildes compuestas
  const alTeclear = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void preguntar(texto);
    }
  };

  const nuevaConversacion = () => {
    setMensajes([]);
    setTexto('');
    campo.current?.focus();
  };

  const largo = texto.length;
  const vacia = texto.trim().length === 0;

  return (
    <>
      <PageHeader
        badge="TUTOR AI"
        title="Tutor CampusSeguro"
        subtitle="Pregunte cómo prevenir y cómo actuar ante un sismo. Las respuestas salen de los contenidos oficiales del campus."
        context={<a className="tu-ctx" href="#/aprendizaje">Centro de aprendizaje →</a>}
      />
      <main className="content tu-main">
        <section className="tu-chat" aria-label="Conversación con el tutor">
          <header className="tu-barra">
            <span className="tu-avatar" aria-hidden="true"><IconoTutor /></span>
            <div className="tu-quien">
              <b>Tutor CampusSeguro</b>
              <small>Responde solo con información preventiva institucional</small>
            </div>
            {mensajes.length > 0 && (
              <button type="button" className="tu-nueva" onClick={nuevaConversacion} disabled={enviando}
                aria-label="Nueva conversación" title="Nueva conversación">
                <IconoNuevo /><span>Nueva conversación</span>
              </button>
            )}
          </header>

          <div className="tu-registro" ref={registro} role="log" aria-live="polite" aria-relevant="additions" aria-busy={enviando}>
            {mensajes.length === 0 ? (
              <div className="tu-bienvenida">
                <span className="tu-avatar grande" aria-hidden="true"><IconoTutor /></span>
                <h2>¿En qué le puedo ayudar?</h2>
                <p>Escriba su pregunta o elija una de estas para empezar.</p>
                <ul className="tu-sugerencias">
                  {SUGERENCIAS.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => void preguntar(s)} disabled={enviando}>{s}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ol className="tu-mensajes">
                {mensajes.map((m, posicion) => (
                  <li key={m.id} className={`tu-fila ${m.de === 'usuario' ? 'propia' : ''}`}>
                    {m.de === 'usuario' && <div className="tu-burbuja usuario">{m.texto}</div>}

                    {m.de === 'tutor' && (
                      <>
                        <span className="tu-avatar" aria-hidden="true"><IconoTutor /></span>
                        <div className="tu-burbuja tutor">
                          <p className="tu-texto">{m.suficiente ? m.texto : FUERA_DE_ALCANCE}</p>
                          {m.suficiente && m.fuentes.length > 0 && (
                            <div className="tu-fuentes">
                              <span>Basado en</span>
                              <ul>
                                {m.fuentes.map((f) => (
                                  <li key={f.id}>
                                    <a href={`#/aprendizaje/${encodeURIComponent(f.id)}`}><IconoLibro />{f.title}</a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {!m.suficiente && (
                            <div className="tu-ejemplos">
                              <span>Puede preguntarme, por ejemplo</span>
                              <ul>
                                {ejemplos(posicion).map((s) => (
                                  <li key={s}>
                                    <button type="button" onClick={() => void preguntar(s)} disabled={enviando}>{s}</button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {m.de === 'error' && (
                      <>
                        <span className="tu-avatar" aria-hidden="true"><IconoTutor /></span>
                        <div className="tu-burbuja error" role="alert">
                          <p className="tu-texto">{m.texto}</p>
                          <button type="button" className="tu-reintentar" disabled={enviando}
                            onClick={() => void preguntar(m.pregunta, m.id)}>
                            Reintentar
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
                {enviando && (
                  <li className="tu-fila">
                    <span className="tu-avatar" aria-hidden="true"><IconoTutor /></span>
                    <div className="tu-burbuja tutor tu-escribiendo" role="status" aria-label="El tutor está escribiendo">
                      <i /><i /><i />
                    </div>
                  </li>
                )}
              </ol>
            )}
          </div>

          <form className="tu-redactor" onSubmit={enviar}>
            <label htmlFor="tu-pregunta" className="tu-oculto">Pregunta para el tutor</label>
            <div className="tu-caja">
              <textarea
                id="tu-pregunta"
                ref={campo}
                rows={1}
                maxLength={MAXIMO}
                value={texto}
                placeholder="Escriba su pregunta sobre sismos o evacuación…"
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={alTeclear}
                aria-describedby="tu-ayuda"
              />
              <button type="submit" className="tu-enviar" disabled={vacia || enviando} aria-label="Enviar pregunta">
                <IconoEnviar />
              </button>
            </div>
            <div className="tu-pie" id="tu-ayuda">
              <span>Enter para enviar · Shift + Enter para un salto de línea</span>
              {largo >= AVISO_LARGO && (
                <span className={largo >= MAXIMO ? 'tu-limite' : ''}>{largo}/{MAXIMO}</span>
              )}
            </div>
          </form>
        </section>

        <p className="tu-nota">
          El tutor no reemplaza los protocolos institucionales ni las indicaciones de brigadistas y coordinadores.
          Durante una emergencia real, siga la ruta de evacuación y las instrucciones del personal.
        </p>
      </main>
    </>
  );
}
