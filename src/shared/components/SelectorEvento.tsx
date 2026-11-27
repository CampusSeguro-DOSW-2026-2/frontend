/** Evento que se puede elegir: lo mínimo para mostrarlo y agruparlo. */
export interface OpcionEvento { id: string; nombre: string; simulacro: boolean; enCurso: boolean }

/** Hasta este número de eventos se muestran pestañas; con más, una lista desplegable. */
export const MAXIMO_PESTANAS = 4;

const etiqueta = (e: OpcionEvento) => `${e.nombre}${e.simulacro ? ' · Simulacro' : ''}`;

/**
 * Elige el evento de una pantalla. Con pocos eventos son pestañas (un toque); con muchos, una lista desplegable nativa,
 * agrupada en «En ejecución» y «Programados», que escala a cualquier cantidad y en el celular abre el selector del
 * sistema. Con un solo evento no se muestra.
 */
export function SelectorEvento({ eventos, valor, onElegir }: {
  eventos: OpcionEvento[]; valor: string | undefined; onElegir: (id: string) => void;
}) {
  if (eventos.length <= 1) return null;
  if (eventos.length <= MAXIMO_PESTANAS) {
    return (
      <div className="ev-tabs" role="group" aria-label="Evento">
        {eventos.map((e) => (
          <button key={e.id} type="button" className="ev-tab" aria-pressed={e.id === valor} onClick={() => onElegir(e.id)}>
            {etiqueta(e)}
          </button>
        ))}
      </div>
    );
  }
  const grupos = [
    { titulo: 'En ejecución', items: eventos.filter((e) => e.enCurso) },
    { titulo: 'Programados', items: eventos.filter((e) => !e.enCurso) },
  ].filter((g) => g.items.length > 0);
  return (
    <div className="selector-evento">
      <label htmlFor="selector-evento">Evento <small>({eventos.length} programados o en ejecución)</small></label>
      <select id="selector-evento" value={valor ?? ''} onChange={(e) => onElegir(e.target.value)}>
        {grupos.map((g) => (
          <optgroup key={g.titulo} label={g.titulo}>
            {g.items.map((e) => <option key={e.id} value={e.id}>{etiqueta(e)}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
