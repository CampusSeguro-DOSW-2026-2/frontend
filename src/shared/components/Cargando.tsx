/**
 * Estado de carga único: indicador y texto que dice qué se está consultando («Cargando alertas…»). Se anuncia a los
 * lectores de pantalla. Para datos que ya están en pantalla y se actualizan, no se usa este componente: el contenedor
 * lleva la clase `actualizando` y `aria-busy`, y muestra una barra fina sin vaciar la pantalla.
 */
export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p className="cargando" role="status">
      <span className="spin" aria-hidden="true" />
      {texto}
    </p>
  );
}
