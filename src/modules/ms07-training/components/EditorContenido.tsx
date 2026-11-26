import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, errorMessage } from '../../../shared/services/http';
import type { FieldErrors } from '../../../shared/services/http';
import type { Categoria, Contenido, ContenidoRequest } from '../types';
import '../styles/aprendizaje.css';

const MAX_TITULO = 150;
const MAX_CUERPO = 20000;

interface Props {
  inicial?: Contenido;
  categorias: Categoria[];
  onGuardar: (datos: ContenidoRequest) => Promise<void>;
  onCancelar: () => void;
}

/**
 * Crear o modificar un contenido (ms07:content:manage). Las reglas repiten las del servidor para avisar antes de
 * enviar; los errores 400 del servidor se marcan en su campo. Una categoría nueva debe estar activa: al modificar se
 * conserva la actual aunque esté inactiva.
 */
export default function EditorContenido({ inicial, categorias, onGuardar, onCancelar }: Props) {
  const [title, setTitle] = useState(inicial?.title ?? '');
  const [body, setBody] = useState(inicial?.body ?? '');
  const [categoryId, setCategoryId] = useState(inicial?.categoryId ?? '');
  const [errores, setErrores] = useState<FieldErrors>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  const opciones = categorias.filter((c) => c.status === 'ACTIVO' || c.id === inicial?.categoryId);

  const validar = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!title.trim()) e.title = 'El título es obligatorio.';
    else if (title.trim().length > MAX_TITULO) e.title = `El título debe tener máximo ${MAX_TITULO} caracteres.`;
    if (!body.trim()) e.body = 'El cuerpo es obligatorio.';
    else if (body.trim().length > MAX_CUERPO) e.body = `El cuerpo debe tener máximo ${MAX_CUERPO} caracteres.`;
    if (!categoryId) e.categoryId = 'La categoría es obligatoria.';
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
      await onGuardar({ title: title.trim(), body: body.trim(), categoryId });
    } catch (err) {
      const campos = err instanceof ApiError ? err.fields : {};
      setErrores(campos);
      if (Object.keys(campos).length === 0) setErrorGeneral(errorMessage(err));
      setGuardando(false);
    }
  };

  return (
    <form className="ap-form" onSubmit={enviar} noValidate aria-label={inicial ? 'Editar contenido' : 'Nuevo contenido'}>
      <h2>{inicial ? 'Editar contenido' : 'Nuevo contenido'}</h2>
      {errorGeneral && <p className="notice err" role="alert">{errorGeneral}</p>}

      <div className="ap-campo">
        <label htmlFor="ap-titulo">Título</label>
        <input id="ap-titulo" type="text" value={title} maxLength={MAX_TITULO + 50}
          aria-invalid={errores.title ? 'true' : undefined} aria-describedby={errores.title ? 'ap-titulo-error' : undefined}
          onChange={(e) => setTitle(e.target.value)} />
        {errores.title && <p className="ap-error" id="ap-titulo-error" role="alert">{errores.title}</p>}
      </div>

      <div className="ap-campo">
        <label htmlFor="ap-categoria">Categoría</label>
        <select id="ap-categoria" value={categoryId}
          aria-invalid={errores.categoryId ? 'true' : undefined} aria-describedby={errores.categoryId ? 'ap-categoria-error' : undefined}
          onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Seleccione una categoría</option>
          {opciones.map((c) => (
            <option key={c.id} value={c.id}>{c.status === 'ACTIVO' ? c.name : `${c.name} (inactiva)`}</option>
          ))}
        </select>
        {errores.categoryId && <p className="ap-error" id="ap-categoria-error" role="alert">{errores.categoryId}</p>}
      </div>

      <div className="ap-campo">
        <label htmlFor="ap-cuerpo">Cuerpo</label>
        <textarea id="ap-cuerpo" value={body}
          aria-invalid={errores.body ? 'true' : undefined} aria-describedby={errores.body ? 'ap-cuerpo-error' : undefined}
          onChange={(e) => setBody(e.target.value)} />
        <small>{body.length} / {MAX_CUERPO} caracteres. Texto plano.</small>
        {errores.body && <p className="ap-error" id="ap-cuerpo-error" role="alert">{errores.body}</p>}
      </div>

      <div className="ap-botones">
        <button type="submit" className="btn red" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar contenido'}</button>
        <button type="button" className="btn white" disabled={guardando} onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
