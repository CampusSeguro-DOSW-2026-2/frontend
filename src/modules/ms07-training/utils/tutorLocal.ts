/**
 * Fase 1 del patrón Two-Phase Predictions (repositorio aaintegration): los saludos, agradecimientos y preguntas sobre
 * el propio tutor se responden aquí, sin llamar a MS07 ni a la IA. Todo lo demás va al tutor (fase 2), que responde
 * solo con los contenidos oficiales. Aquí nunca se responde nada sobre prevención o emergencias.
 */

const SALUDO =
  '¡Hola! Soy el Tutor CampusSeguro. Le ayudo con qué hacer ante una emergencia en el campus: sismos, incendios, fugas '
  + 'o derrames de sustancias, evacuación, personas lesionadas y la prevención en salones, laboratorios, auditorios y '
  + 'oficinas. ¿Qué le gustaría saber?';
const QUE_HACE =
  'Respondo preguntas sobre prevención y actuación ante emergencias en el campus (sismos, incendios, fugas o derrames '
  + 'de sustancias, evacuación, personas lesionadas y prevención según el tipo de espacio) usando solo los contenidos '
  + 'oficiales, y le indico de cuáles saqué cada respuesta. Por ejemplo: «¿Qué hago si hay un derrame de un químico en '
  + 'el laboratorio?» o «¿Cómo evacúo un auditorio?».';
const GRACIAS = '¡Con gusto! Si tiene otra pregunta sobre una emergencia en el campus, escríbala cuando quiera.';

const PALABRAS_SALUDO = new Set([
  'hola', 'holi', 'hey', 'buenas', 'buenos', 'buen', 'dia', 'dias', 'tardes', 'noches', 'saludos', 'que', 'tal',
  'como', 'estas', 'esta', 'tutor', 'campusseguro',
]);
const PALABRAS_GRACIAS = new Set([
  'gracias', 'muchas', 'mil', 'ok', 'okay', 'vale', 'listo', 'perfecto', 'genial', 'chao', 'adios', 'bye', 'entendido',
  'super', 'excelente', 'muy', 'bien', 'tutor',
]);
const PREGUNTAS_SOBRE_EL_TUTOR = [
  'que puedes hacer', 'que haces', 'que sabes', 'quien eres', 'que eres', 'como funcionas', 'como te uso', 'ayuda',
  'en que me ayudas', 'en que me puedes ayudar', 'para que sirves',
];

/** Minúsculas, sin tildes ni signos: «¡Hola, buenas tardes!» → «hola buenas tardes». */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const soloPalabrasDe = (palabras: string[], conjunto: Set<string>) =>
  palabras.length > 0 && palabras.length <= 6 && palabras.every((p) => conjunto.has(p));

/** Respuesta local si el mensaje es solo un saludo, un agradecimiento o una pregunta sobre el tutor; si no, null. */
export function respuestaLocal(texto: string): string | null {
  const limpio = normalizar(texto);
  const palabras = limpio.split(' ').filter(Boolean);
  if (PREGUNTAS_SOBRE_EL_TUTOR.some((p) => limpio === p || limpio === `hola ${p}`)) return QUE_HACE;
  if (soloPalabrasDe(palabras, PALABRAS_SALUDO)) return SALUDO;
  if (soloPalabrasDe(palabras, PALABRAS_GRACIAS)) return GRACIAS;
  return null;
}
