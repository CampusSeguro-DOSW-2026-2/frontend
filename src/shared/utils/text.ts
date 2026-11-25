/**
 * Utilidades de texto para lo que se muestra al usuario. Los identificadores técnicos (UUID) nunca se muestran: se
 * conservan internamente para las relaciones entre servicios.
 */
const UUID_GLOBAL = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const UUID_ONLY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** true si el texto es un UUID (o está vacío): no sirve como nombre para mostrar. */
export const isTechnicalId = (value: string | null | undefined): boolean => !value?.trim() || UUID_ONLY.test(value.trim());

/** Quita los UUID de un texto libre (por ejemplo, un detalle o un mensaje del servidor) y limpia los restos. */
export function withoutIds(value: string): string {
  return value
    .replace(UUID_GLOBAL, '')
    .replace(/\(\s*\)|\[\s*\]/g, '')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/[:#]\s*(?=[.,;]|$)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Nombre para mostrar: el primero que no esté vacío ni sea un id técnico, o el texto alterno. */
export function displayName(fallback: string, ...candidates: (string | null | undefined)[]): string {
  const found = candidates.find((c) => !isTechnicalId(c));
  return found ? found.trim() : fallback;
}
