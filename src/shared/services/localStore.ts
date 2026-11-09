// Almacenamiento local de los datos de demostración de los módulos que aún no tienen backend.
export const read = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
export const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

// Fecha ISO de hace `min` minutos
export const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
