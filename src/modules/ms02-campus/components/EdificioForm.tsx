import { useState } from 'react';
import type { Campus, Edificio, EdificioRequest } from '../types';
import { Botones, Campo, Falla } from './comun';
import { useEnvio, type Errores } from '../hooks/useEnvio';

/** Datos del edificio: lo usan la lista (crear) y la pantalla del edificio (modificar). */
export default function EdificioForm({ inicial, campuses, onGuardar, onCancelar }: {
  inicial?: Edificio; campuses: Campus[]; onGuardar: (datos: EdificioRequest) => Promise<void>; onCancelar: () => void;
}) {
  const opciones = campuses.filter((c) => c.estado === 'ACTIVO' || c.id === inicial?.campusId);
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [campusId, setCampusId] = useState(inicial?.campusId ?? opciones[0]?.id ?? '');
  const { errores, general, guardando, enviar } = useEnvio(onGuardar);
  const id = inicial?.id ?? 'nuevo';

  const validar = () => {
    const e: Errores = {};
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    else if (nombre.trim().length > 100) e.nombre = 'El nombre no puede superar 100 caracteres.';
    if (!campusId) e.campusId = 'Elige el campus al que pertenece el edificio.';
    return e;
  };

  return (
    <form className="cs-editor" noValidate onSubmit={(e) => {
      e.preventDefault();
      enviar(validar(), { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined, campusId });
    }}>
      <div className="cs-campos">
        <Campo id={`edificio-nombre-${id}`} etiqueta="Nombre" error={errores.nombre}>
          <input id={`edificio-nombre-${id}`} value={nombre} placeholder="Bloque G" onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo id={`edificio-campus-${id}`} etiqueta="Campus" error={errores.campusId}>
          <select id={`edificio-campus-${id}`} value={campusId} onChange={(e) => setCampusId(e.target.value)}>
            {opciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
      </div>
      <Campo id={`edificio-descripcion-${id}`} etiqueta="Descripción (opcional)" error={errores.descripcion}>
        <textarea id={`edificio-descripcion-${id}`} value={descripcion} placeholder="Laboratorios y aulas de ingeniería" onChange={(e) => setDescripcion(e.target.value)} />
      </Campo>
      {general && <Falla error={general} />}
      <Botones guardando={guardando} onCancelar={onCancelar} />
    </form>
  );
}
