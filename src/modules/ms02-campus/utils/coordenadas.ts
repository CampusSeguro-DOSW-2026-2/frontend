/** Enlace para revisar un punto en OpenStreetMap (no hace falta un mapa interactivo). */
export function enlaceOsm(latitud: number, longitud: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=18/${latitud}/${longitud}`;
}

export function textoCoordenadas(latitud: number, longitud: number): string {
  return `${latitud}, ${longitud}`;
}

/**
 * Lee una coordenada escrita por la persona (acepta coma decimal). Devuelve undefined si está vacía,
 * el número si es válido y un texto de error si no lo es.
 */
export function leerCoordenada(texto: string, eje: 'latitud' | 'longitud'): number | string | undefined {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return undefined;
  const limite = eje === 'latitud' ? 90 : 180;
  const etiqueta = eje === 'latitud' ? 'La latitud' : 'La longitud';
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return `${etiqueta} debe ser un número, por ejemplo 4.78271.`;
  const valor = Number(limpio);
  if (Math.abs(valor) > limite) return `${etiqueta} debe estar entre -${limite} y ${limite}.`;
  return valor;
}
