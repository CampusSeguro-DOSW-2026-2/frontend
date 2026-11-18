# MS07 · Formación y asistente IA

**Alcance:** Contenidos de aprendizaje preventivo, evaluaciones y asistente (Tutor AI).

**Estado:** contenidos, categorías, evaluaciones y progreso conectados a MS07 (`/api/v1/training/...`). Tutor, pendiente.

## Pantallas

| Ruta | Pantalla | Permiso | Qué hace |
|---|---|---|---|
| `#/aprendizaje` | `pages/Aprendizaje.tsx` | `ms07:content:read` o `ms07:content:manage` | Contenidos activos, con filtro por categoría. Un contenido activo se ve aunque su categoría esté inactiva |
| `#/aprendizaje/{id}` | `pages/ContenidoDetalle.tsx` | `ms07:content:read` o `ms07:content:manage` | Lee el contenido y registra la consulta en el progreso (`POST /contents/{id}/views`; si falla, no interrumpe la lectura) |
| `#/admin/aprendizaje` | `pages/AdminContenidos.tsx` | `ms07:content:manage` | Crear, modificar, inactivar y reactivar contenidos y categorías (editores en `components/EditorContenido.tsx` y `components/EditorCategoria.tsx`) |
| `#/evaluaciones` | `pages/Evaluaciones.tsx` | `ms07:quiz:take` | Evaluaciones activas, con filtro por categoría |
| `#/evaluaciones/{id}` | `pages/PresentarEvaluacion.tsx` | `ms07:quiz:take` | Presentar la evaluación y ver el puntaje con la corrección; se puede repetir |
| `#/mi-progreso` | `pages/MiProgreso.tsx` | `ms07:quiz:take` | Avance por categoría (contenidos vistos y promedio de los mejores puntajes), mejor resultado de cada evaluación y contenidos consultados; lo inactivado después sale como «No disponible» |
| `#/admin/evaluaciones` | `pages/AdminEvaluaciones.tsx` | `ms07:content:manage` | Crear, modificar, inactivar y reactivar evaluaciones (editor en `components/EditorEvaluacion.tsx`) |

Las pantallas y el menú se muestran por permiso del token, nunca por nombre de rol. Nada se borra: lo inactivo solo
deja de verse para la comunidad. Una evaluación que ya tiene intentos no se puede modificar (MS07 responde 409): hay
que inactivarla y crear otra. El cuerpo de un contenido es texto plano.

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/training.ts` | Cliente de MS07 por el API Gateway |
| `styles/` | Estilos del módulo (prefijo `ev-` para evaluaciones y `ap-` para contenidos) |
| `utils/` | Funciones auxiliares del módulo |
| `hooks/` | Hooks propios del módulo |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
