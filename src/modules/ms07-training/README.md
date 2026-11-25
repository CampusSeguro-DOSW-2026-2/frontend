# MS07 · Formación y asistente IA

**Alcance:** Contenidos de aprendizaje preventivo, evaluaciones y asistente (Tutor AI).

**Estado:** contenidos, categorías, evaluaciones, progreso y tutor conectados a MS07 (`/api/v1/training/...` y `/api/v1/tutor/...`).

## Pantallas

| Ruta | Pantalla | Permiso | Qué hace |
|---|---|---|---|
| `#/aprendizaje` | `pages/Aprendizaje.tsx` | `ms07:content:read` o `ms07:content:manage` | Contenidos activos, con filtro por categoría. Un contenido activo se ve aunque su categoría esté inactiva |
| `#/aprendizaje/{id}` | `pages/ContenidoDetalle.tsx` | `ms07:content:read` o `ms07:content:manage` | Lee el contenido y registra la consulta en el progreso (`POST /contents/{id}/views`; si falla, no interrumpe la lectura) |
| `#/admin/aprendizaje` | `pages/AdminContenidos.tsx` | `ms07:content:manage` | Crear, modificar, inactivar y reactivar contenidos y categorías (editores en `components/EditorContenido.tsx` y `components/EditorCategoria.tsx`) |
| `#/evaluaciones` | `pages/Evaluaciones.tsx` | `ms07:quiz:take` | Evaluaciones activas, con filtro por categoría |
| `#/evaluaciones/{id}` | `pages/PresentarEvaluacion.tsx` | `ms07:quiz:take` | Presentar la evaluación y ver el puntaje con la corrección; se puede repetir |
| `#/mi-progreso` | `pages/MiProgreso.tsx` | `ms07:quiz:take` | Avance por categoría (contenidos vistos y promedio de los mejores puntajes), mejor resultado de cada evaluación y contenidos consultados; lo inactivado después sale como «No disponible» |
| `#/tutor` | `pages/Tutor.tsx` | `ms07:tutor:use` | Chat con el Tutor CampusSeguro (RF-15): preguntas sugeridas, respuesta con los contenidos usados como fuente (enlazan a `#/aprendizaje/{id}`), mensaje amable cuando la pregunta no es del tema o los contenidos no la cubren (con el protocolo oficial y dos preguntas de ejemplo) y botón Reintentar si la IA no responde a tiempo |
| `#/admin/evaluaciones` | `pages/AdminEvaluaciones.tsx` | `ms07:content:manage` | Crear, modificar, inactivar y reactivar evaluaciones (editor en `components/EditorEvaluacion.tsx`) |

Las pantallas y el menú se muestran por permiso del token, nunca por nombre de rol. Nada se borra: lo inactivo solo
deja de verse para la comunidad. Una evaluación que ya tiene intentos no se puede modificar (MS07 responde 409): hay
que inactivarla y crear otra. El cuerpo de un contenido es texto plano.

**Tutor:** Enter envía y Shift + Enter hace un salto de línea; la pregunta tiene máximo 500 caracteres. La conversación
se guarda solo en el `sessionStorage` de la pestaña (para no perderla al abrir una fuente y volver) y se borra con
«Nueva conversación» o al cerrar la pestaña; MS07 nunca guarda el texto de las preguntas ni de las respuestas.
Los saludos, agradecimientos y preguntas sobre el propio tutor («hola», «gracias», «¿qué puedes hacer?») se responden
en el navegador sin llamar a MS07 (`utils/tutorLocal.ts`, fase 1 del patrón Two-Phase Predictions del repositorio
aaintegration); todo lo demás lo responde el tutor con los contenidos oficiales.

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/training.ts` | Cliente de MS07 por el API Gateway |
| `styles/` | Estilos del módulo (prefijo `ev-` para evaluaciones, `ap-` para contenidos y `tu-` para el tutor) |
| `utils/` | Funciones auxiliares del módulo |
| `hooks/` | Hooks propios del módulo |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
