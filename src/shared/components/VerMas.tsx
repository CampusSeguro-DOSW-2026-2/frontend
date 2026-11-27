/** Botón «Ver los N restantes» de las listas recortadas con useVerMas; sin restantes no se muestra. */
export function VerMas({ restantes, onClick, que = 'eventos' }: { restantes: number; onClick: () => void; que?: string }) {
  if (restantes <= 0) return null;
  return (
    <button type="button" className="btn white ver-mas" onClick={onClick}>
      {restantes === 1 ? `Ver 1 ${que.replace(/s$/, '')} más` : `Ver los ${restantes} ${que} restantes`}
    </button>
  );
}
