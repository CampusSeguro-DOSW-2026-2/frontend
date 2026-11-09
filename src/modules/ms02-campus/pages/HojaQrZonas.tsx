import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { campus, CampusApiError, comoCampusError as comoError, descargarQr } from '../services/campus';
import { Falla } from '../components/comun';
import '../styles/campus.css';
import '../styles/hoja-qr.css';

interface Tarjeta {
  id: string;
  titulo: string;
  detalle: string;
  ubicacion: string;
  imagen?: string;
  error?: string;
}

/** Hoja imprimible con el QR de las zonas seguras activas (igual que la de un edificio). Con zonaId, solo esa zona. */
export default function HojaQrZonas({ zonaId }: { zonaId?: string }) {
  const [tarjetas, setTarjetas] = useState<Tarjeta[] | null>(null);
  const [error, setError] = useState<CampusApiError | null>(null);

  useEffect(() => {
    let vigente = true;
    const urls: string[] = [];
    campus.zonas.listar()
      .then(async (zonas) => {
        if (!vigente) return;
        const lista: Tarjeta[] = zonas
          .filter((z) => z.estado === 'ACTIVO' && (!zonaId || z.id === zonaId))
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
          .map((z) => ({
            id: z.id,
            titulo: z.nombre,
            detalle: `${z.puntoEncuentro ? 'Punto de encuentro' : 'Zona segura'} · ${z.codigo}`,
            ubicacion: z.ubicacion,
          }));
        setTarjetas(lista);
        for (const t of lista) {
          try {
            const url = URL.createObjectURL(await descargarQr('zona', t.id));
            urls.push(url);
            if (vigente) setTarjetas((actual) => actual && actual.map((x) => (x.id === t.id ? { ...x, imagen: url } : x)));
          } catch (e) {
            if (vigente) setTarjetas((actual) => actual && actual.map((x) => (x.id === t.id ? { ...x, error: comoError(e).message } : x)));
          }
        }
      })
      .catch((e) => { if (vigente) setError(comoError(e)); });
    return () => { vigente = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [zonaId]);

  const pendientes = tarjetas?.filter((t) => !t.imagen && !t.error).length ?? 0;

  return (
    <>
      <div className="no-imprimir">
        <PageHeader badge="ADMINISTRACIÓN" title={zonaId && tarjetas?.length === 1 ? `Código QR · ${tarjetas[0].titulo}` : 'Códigos QR · Zonas seguras'}
          subtitle="Imprime y pega el código en su punto de encuentro. Al escanearlo se ve cómo llegar."
          context={<a className="cs-volver" href="#/admin/zonas">← Zonas seguras</a>} />
      </div>
      <main className="content">
        {error && <Falla error={error} />}
        {tarjetas && (
          <div className="cs-barra no-imprimir">
            <div className="cs-barra-titulo">
              <span className="cs-resumen">
                {tarjetas.length} {tarjetas.length === 1 ? 'código' : 'códigos'} · zonas seguras activas
                {pendientes > 0 && ` · generando ${pendientes}…`}
              </span>
            </div>
            <button type="button" className="btn red cs-agregar" disabled={pendientes > 0 || tarjetas.length === 0}
              onClick={() => window.print()}>Imprimir</button>
          </div>
        )}
        {tarjetas?.length === 0 && (
          <p className="cs-alert info">{zonaId ? 'Esta zona no existe o no está activa.' : 'No hay zonas seguras activas para imprimir.'}</p>
        )}
        {tarjetas && tarjetas.length > 0 && (
          <ul className="qr-hoja">
            {tarjetas.map((t) => (
              <li key={t.id} className="qr-ficha">
                {t.imagen
                  ? <img src={t.imagen} alt={`Código QR de ${t.titulo}`} width={180} height={180} />
                  : <span className="qr-espera">{t.error ?? 'Generando…'}</span>}
                <strong>{t.titulo}</strong>
                <span>{t.detalle}</span>
                <small>{t.ubicacion ? `${t.ubicacion} · ` : ''}Escanee en caso de emergencia</small>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
