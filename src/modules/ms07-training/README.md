# MS07 · Formación y asistente IA

**Alcance:** Contenidos de aprendizaje preventivo, evaluaciones y asistente (Tutor AI).

**Estado:** evaluaciones conectadas a MS07 (`/api/v1/training/evaluations`). Contenidos, progreso y tutor, pendientes.

## Pantallas

| Ruta | Pantalla | Permiso | Qué hace |
|---|---|---|---|
| `#/evaluaciones` | `pages/Evaluaciones.tsx` | `ms07:quiz:take` | Evaluaciones activas, con filtro por categoría |
| `#/evaluaciones/{id}` | `pages/PresentarEvaluacion.tsx` | `ms07:quiz:take` | Presentar la evaluación y ver el puntaje con la corrección; se puede repetir |
| `#/admin/evaluaciones` | `pages/AdminEvaluaciones.tsx` | `ms07:content:manage` | Crear, modificar, inactivar y reactivar evaluaciones (editor en `components/EditorEvaluacion.tsx`) |

Las pantallas y el menú se muestran por permiso del token, nunca por nombre de rol. Una evaluación que ya tiene
intentos no se puede modificar (MS07 responde 409): hay que inactivarla y crear otra.

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/training.ts` | Cliente de MS07 por el API Gateway |
| `styles/` | Estilos del módulo (prefijo `ev-` para evaluaciones) |
| `hooks/` | Hooks propios del módulo |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
