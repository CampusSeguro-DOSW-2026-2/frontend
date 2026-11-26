import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, errorMessage } from '../../../shared/services/http';
import type { FieldErrors } from '../../../shared/services/http';
import type { Categoria, CategoriaRequest } from '../types';
import '../styles/aprendizaje.css';

const MAX_NOMBRE = 100;
const MAX_DESCRIPCION = 500;

interface Props {
  inicial?: Categoria;
  onGuardar: (datos: CategoriaRequest) => Promise<void>;
  onCancelar: () => void;
}

/** Crear o modificar una categoría (ms07:content:manage). El nombre no se puede repetir: el servidor responde 409. */
export default function EditorCategoria({ inicial, onGuardar, onCancelar }: Props) {
  const [name, setName] = useState(inicial?.name ?? '');
  const [description, setDescription] = useState(inicial?.description ?? '');
  const [errores, setErrores] = useState<FieldErrors>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  const validar = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = 'El nombre es obligatorio.';
    else if (name.trim().length > MAX_NOMBRE) e.name = `El nombre debe tener máximo ${MAX_NOMBRE} caracteres.`;
    if (description.trim().length > MAX_DESCRIPCION) {
      e.description = `La descripción debe tener máximo ${MAX_DESCRIPCION} caracteres.`;
    }
    return e;
  };

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (guardando) return;
    const encontrados = validar();
    setErrores(encontrados);
    setErrorGeneral('');
    if (Object.keys(encontrados).length > 0) return;
    setGuardando(true);
    try {
      await onGuardar({ name: name.trim(), description: description.trim() || null });
    } catch (err) {
      const campos = err instanceof ApiError ? err.fields : {};
      setErrores(campos);
      if (Object.keys(campos).length === 0) setErrorGeneral(errorMessage(err));
      setGuardando(false);
    }
  };

  return (
    <form className="ap-form" onSubmit={enviar} noValidate aria-label={inicial ? 'Editar categoría' : 'Nueva categoría'}>
      <h2>{inicial ? 'Editar categoría' : 'Nueva categoría'}</h2>
      {errorGeneral && <p className="notice err" role="alert">{errorGeneral}</p>}

      <div className="ap-campo">
        <label htmlFor="ap-nombre">Nombre</label>
        <input id="ap-nombre" type="text" value={name} maxLength={MAX_NOMBRE + 50}
          aria-invalid={errores.name ? 'true' : undefined} aria-describedby={errores.name ? 'ap-nombre-error' : undefined}
          onChange={(e) => setName(e.target.value)} />
        {errores.name && <p className="ap-error" id="ap-nombre-error" role="alert">{errores.name}</p>}
      </div>

      <div className="ap-campo">
        <label htmlFor="ap-descripcion">Descripción (opcional)</label>
        <textarea id="ap-descripcion" className="corta" value={description}
          aria-invalid={errores.description ? 'true' : undefined}
          aria-describedby={errores.description ? 'ap-descripcion-error' : undefined}
          onChange={(e) => setDescription(e.target.value)} />
        <small>{description.length} / {MAX_DESCRIPCION} caracteres.</small>
        {errores.description && <p className="ap-error" id="ap-descripcion-error" role="alert">{errores.description}</p>}
      </div>

      <div className="ap-botones">
        <button type="submit" className="btn red" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar categoría'}</button>
        <button type="button" className="btn white" disabled={guardando} onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
