import { useEffect, useState } from 'react';
import { PageHeader } from '../../../shared/components/Layout';
import { campus, CampusApiError, comoCampusError as comoError, descargarQr, type ElementoQr } from '../services/campus';
import type { Edificio } from '../types';
import { TIPOS } from '../types';
import { Falla } from '../components/comun';
import '../styles/campus.css';
import '../styles/hoja-qr.css';

interface Tarjeta {
  id: string;
  elemento: ElementoQr;
  titulo: string;
  detalle: string;
  orden: string;
  imagen?: string;
  error?: string;
}

async function leer(edificioId: string) {
  const [edificio, pisos, espacios, salidas] = await Promise.all([
    campus.edificios.obtener(edificioId),
    campus.pisos.listarPorEdificio(edificioId),
    campus.espacios.listarPorEdificio(edificioId),
    campus.salidas.listarPorEdificio(edificioId),
  ]);
  const numero = new Map(pisos.map((p) => [p.id, p.numero]));
  const piso = (id: string) => numero.get(id);
  const clave = (n?: number) => String((n ?? 0) + 1000).padStart(5, '0');
  const tarjetas: Tarjeta[] = [
    ...salidas.map((s) => ({
      id: s.id, elemento: 'salida' as const, titulo: s.nombre, orden: `0-${clave(piso(s.pisoId))}-${s.nombre}`,
      detalle: `Salida · Piso ${piso(s.pisoId) ?? '—'}`,
    })),
    ...espacios.map((e) => ({
      id: e.id, elemento: 'espacio' as const, titulo: e.nombre, orden: `1-${clave(piso(e.pisoId))}-${e.nombre}`,
      detalle: `${TIPOS[e.tipo]} · Piso ${piso(e.pisoId) ?? '—'}`,
    })),
  ].sort((a, b) => a.orden.localeCompare(b.orden));
  return { edificio, tarjetas };
}

export default function HojaQr({ edificioId }: { edificioId: string }) {
  const [edificio, setEdificio] = useState<Edificio | null>(null);
  const [tarjetas, setTarjetas] = useState<Tarjeta[] | null>(null);
  const [error, setError] = useState<CampusApiError | null>(null);

  useEffect(() => {
    let vigente = true;
    const urls: string[] = [];
    leer(edificioId)
      .then(async (datos) => {
        if (!vigente) return;
        setEdificio(datos.edificio);
        setTarjetas(datos.tarjetas);
        for (const t of datos.tarjetas) {
          try {
            const url = URL.createObjectURL(await descargarQr(t.elemento, t.id));
            urls.push(url);
            if (vigente) setTarjetas((actual) => actual && actual.map((x) => (x.id === t.id ? { ...x, imagen: url } : x)));
          } catch (e) {
            if (vigente) setTarjetas((actual) => actual && actual.map((x) => (x.id === t.id ? { ...x, error: comoError(e).message } : x)));
          }
        }
      })
      .catch((e) => { if (vigente) setError(comoError(e)); });
    return () => { vigente = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [edificioId]);

  const pendientes = tarjetas?.filter((t) => !t.imagen && !t.error).length ?? 0;

  return (
    <>
      <div className="no-imprimir">
        <PageHeader badge="ADMINISTRACIÓN" title={`Códigos QR${edificio ? ` · ${edificio.nombre}` : ''}`}
          subtitle="Imprime y pega cada código en su salón o salida. Al escanearlo se ve la guía de evacuación."
          context={<a className="cs-volver" href={`#/admin/edificios/${edificioId}`}>← Detalle del edificio</a>} />
      </div>
      <main className="content">
        {error && <Falla error={error} />}
        {tarjetas && (
          <div className="cs-barra no-imprimir">
            <div className="cs-barra-titulo">
              <span className="cs-resumen">
                {tarjetas.length} {tarjetas.length === 1 ? 'código' : 'códigos'} · salidas y espacios disponibles
                {pendientes > 0 && ` · generando ${pendientes}…`}
              </span>
            </div>
            <button type="button" className="btn red cs-agregar" disabled={pendientes > 0 || tarjetas.length === 0}
              onClick={() => window.print()}>Imprimir</button>
          </div>
        )}
        {tarjetas?.length === 0 && (
          <p className="cs-alert info">Este edificio no tiene espacios ni salidas disponibles para imprimir.</p>
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
                <small>{edificio?.nombre} · Escanee en caso de emergencia</small>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
