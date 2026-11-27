import { useState, type ReactNode } from 'react';
import { Cargando } from '../../../shared/components/Cargando';
import { Mensaje } from '../../../shared/components/Mensaje';
import type { CampusApiError } from '../services/campus';
import type { EstadoRutas } from '../hooks/useEstadoRutas';
import type { Espacio, Piso } from '../types';
import { listaPisos, pisosSinEscalera, salidaUtil, TEXTO_ESCALERA_PRINCIPAL } from '../utils/verificacion';

export interface AccionesVerificacion {
  agregarPiso: () => void;
  agregarEspacio: () => void;
  agregarSalida: () => void;
  /** Sin permiso para gestionar escaleras no se ofrece. */
  registrarEscalera?: () => void;
  /** Crea la «Escalera principal» con todos los pisos activos. Sin permiso no se ofrece. */
  crearEscaleraPrincipal?: () => Promise<void>;
}

interface Fila {
  clave: string;
  titulo: string;
  ok: boolean;
  detalle: string;
  accion?: ReactNode;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Nombres de hasta cinco espacios y «y N más». */
function nombres(lista: string[]): string {
  const vistos = lista.slice(0, 5).map((n) => `«${n}»`).join(', ');
  return lista.length > 5 ? `${vistos} y ${lista.length - 5} más` : vistos;
}

/**
 * Lista de verificación del detalle de un edificio: dice cuántos espacios ya tienen ruta de evacuación y qué requisito
 * falta (pisos, espacios, salida, escalera y zona segura), con el botón que lleva a resolverlo.
 */
export function VerificacionRutas({ pisos, espacios, estado, error, actualizando, acciones, onReintentar }: {
  pisos: Piso[];
  espacios: Espacio[];
  estado: EstadoRutas | null;
  error: CampusApiError | null;
  actualizando: boolean;
  acciones: AccionesVerificacion;
  onReintentar: () => void;
}) {
  const [creando, setCreando] = useState(false);

  if (!estado) {
    return (
      <section className="cs-piso cs-verif" aria-label="Rutas de este edificio">
        {error ? <Mensaje error={error} onReintentar={onReintentar} /> : <Cargando texto="Revisando las rutas del edificio…" />}
      </section>
    );
  }

  const pisosActivos = pisos.filter((p) => p.estado === 'ACTIVO');
  const idsActivos = new Set(pisosActivos.map((p) => p.id));
  const espaciosActivos = espacios.filter((s) => s.estado === 'ACTIVO' && idsActivos.has(s.pisoId));
  const salidasActivas = estado.salidas.filter((s) => s.estado === 'ACTIVO');
  const salidasUtiles = salidasActivas.filter(salidaUtil);
  const escalerasActivas = estado.escaleras.filter((e) => e.estado === 'ACTIVO');

  const filas: Fila[] = [
    {
      clave: 'pisos',
      titulo: 'Pisos',
      ok: pisosActivos.length > 0,
      detalle: pisosActivos.length > 0
        ? `${plural(pisosActivos.length, 'piso activo', 'pisos activos')}.`
        : 'El edificio no tiene pisos activos.',
      accion: <button type="button" className="cs-mini" onClick={acciones.agregarPiso}>Agregar piso</button>,
    },
    {
      clave: 'espacios',
      titulo: 'Espacios',
      ok: espaciosActivos.length > 0,
      detalle: espaciosActivos.length > 0
        ? `${plural(espaciosActivos.length, 'espacio activo', 'espacios activos')}.`
        : 'No hay espacios activos: son el punto de partida de cada ruta.',
      accion: pisosActivos.length > 0
        ? <button type="button" className="cs-mini" onClick={acciones.agregarEspacio}>Agregar espacio</button>
        : undefined,
    },
    {
      clave: 'salida',
      titulo: 'Salida al exterior',
      ok: salidasUtiles.length > 0,
      detalle: salidasUtiles.length > 0
        ? `${plural(salidasUtiles.length, 'salida disponible', 'salidas disponibles')}.`
        : salidasActivas.length > 0
          ? 'Las salidas registradas no están disponibles.'
          : 'Sin una salida no se puede calcular la ruta exterior.',
      accion: pisosActivos.length > 0
        ? <button type="button" className="cs-mini" onClick={acciones.agregarSalida}>Agregar salida</button>
        : undefined,
    },
  ];

  if (pisosActivos.length > 1) {
    const sinEscalera = pisosSinEscalera(pisos, espacios, estado.escaleras, estado.salidas);
    const verbo = sinEscalera.length === 1 ? 'no está conectado' : 'no están conectados';
    filas.push({
      clave: 'escalera',
      titulo: 'Escalera',
      ok: sinEscalera.length === 0,
      detalle: sinEscalera.length === 0
        ? 'Las escaleras conectan todos los pisos que tienen espacios.'
        : escalerasActivas.length === 0
          ? `El edificio tiene ${pisosActivos.length} pisos y ninguna escalera activa.`
          : `${listaPisos(sinEscalera).replace(/^./, (c) => c.toUpperCase())} ${verbo} por una escalera disponible con el piso de la salida.`,
      accion: (
        <>
          {escalerasActivas.length === 0 && acciones.crearEscaleraPrincipal && (
            <button type="button" className="cs-mini primario cs-envolver" disabled={creando} aria-busy={creando || undefined}
              onClick={async () => {
                setCreando(true);
                try { await acciones.crearEscaleraPrincipal?.(); } finally { setCreando(false); }
              }}>
              {creando ? 'Creando escalera…' : TEXTO_ESCALERA_PRINCIPAL}
            </button>
          )}
          {acciones.registrarEscalera && (
            <button type="button" className="cs-mini" onClick={acciones.registrarEscalera}>Registrar escalera</button>
          )}
        </>
      ),
    });
  }

  const sinZona = salidasUtiles.filter((s) => !estado.salidasConZona.has(s.id));
  filas.push({
    clave: 'zona',
    titulo: 'Zona segura conectada',
    ok: estado.salidasConZona.size > 0,
    detalle: salidasUtiles.length === 0
      ? 'Primero registre una salida al exterior.'
      : estado.salidasConZona.size === 0
        ? 'Ninguna salida tiene una ruta exterior hasta una zona segura.'
        : sinZona.length > 0
          ? `${plural(estado.salidasConZona.size, 'salida llega', 'salidas llegan')} a una zona segura; ${nombres(sinZona.map((s) => s.nombre))} todavía no.`
          : salidasUtiles.length === 1
            ? `La salida «${salidasUtiles[0].nombre}» llega a una zona segura.`
            : 'Todas las salidas llegan a una zona segura.',
    accion: salidasUtiles.length > 0
      ? <a className="cs-mini" href="#/admin/rutas">Revisar rutas exteriores</a>
      : undefined,
  });

  const rutas = estado.rutas;
  const listos = rutas?.filter((r) => r.listo).length ?? 0;
  const pendientes = rutas?.filter((r) => !r.listo && !r.sinDato) ?? [];
  const sinDato = rutas?.filter((r) => r.sinDato) ?? [];
  const todoBien = filas.every((f) => f.ok) && rutas !== null && rutas.length > 0 && listos === rutas.length;
  const clases = `cs-piso cs-verif actualizando`;

  if (todoBien) {
    return (
      <section className={clases} aria-label="Rutas de este edificio" aria-busy={actualizando}>
        <Mensaje tono="exito" compacto>Todos los espacios tienen ruta de evacuación</Mensaje>
      </section>
    );
  }

  return (
    <section className={clases} aria-labelledby="verif-titulo" aria-busy={actualizando}>
      <h2 className="cs-piso-titulo" id="verif-titulo">
        Rutas de este edificio:{' '}
        <span>
          {rutas === null
            ? 'sin calcular'
            : rutas.length === 0
              ? 'todavía no hay espacios para guiar'
              : `${listos} de ${plural(rutas.length, 'espacio listo', 'espacios listos')}`}
        </span>
      </h2>
      {estado.errorRutas && (
        <Mensaje tono="aviso" compacto onReintentar={onReintentar}>
          No se pudo consultar la ruta de cada espacio. Los requisitos de abajo sí están al día.
        </Mensaje>
      )}

      <ul className="cs-verif-lista">
        {filas.map((f) => (
          <li key={f.clave} className={f.ok ? 'ok' : 'falta'}>
            <span className="cs-verif-marca" aria-hidden="true">{f.ok ? '✓' : '✗'}</span>
            <div className="cs-verif-texto">
              <b>{f.titulo}<span className="cs-oculto">{f.ok ? ': listo' : ': falta'}</span></b>
              <span>{f.detalle}</span>
            </div>
            {!f.ok && f.accion}
          </li>
        ))}
      </ul>

      {filas.every((f) => f.ok) && pendientes.length > 0 && (
        <Mensaje tono="aviso" compacto acciones={<a className="plink" href="#/rutas">Consultar las rutas del edificio</a>}>
          Todavía {pendientes.length === 1 ? 'no tiene ruta' : 'no tienen ruta'}: {nombres(pendientes.map((r) => r.espacioNombre))}.
        </Mensaje>
      )}
      {sinDato.length > 0 && (
        <p className="cs-sub">No se pudo revisar la ruta de {plural(sinDato.length, 'espacio', 'espacios')}; se cuentan como pendientes.</p>
      )}

      <details className="cs-verif-ayuda">
        <summary>¿Cómo se arma una ruta?</summary>
        <ol className="cs-verif-pasos">
          <li>Espacio</li>
          <li>Escalera <span>(si no está en el piso 1)</span></li>
          <li>Salida al exterior</li>
          <li>Ruta exterior</li>
          <li>Zona segura</li>
        </ol>
      </details>
    </section>
  );
}
