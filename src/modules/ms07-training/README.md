# MS07 · Formación y asistente IA

**Alcance:** Contenidos de aprendizaje preventivo, evaluaciones y asistente (Tutor AI).

**Estado:** contenidos, categorías, evaluaciones, progreso y tutor conectados a MS07 (`/api/v1/training/...` y `/api/v1/tutor/...`).

## Pantallas

| Ruta | Pantalla | Permiso | Qué hace |
|---|---|---|---|
| `#/aprendizaje` | `pages/Aprendizaje.tsx` | `ms07:content:read` o `ms07:content:manage` | Contenidos activos, con filtro por categoría. Un contenido activo se ve aunque su categoría esté inactiva. Con `ms07:quiz:take` muestra el progreso: barra «Ha consultado X de Y contenidos» (de la categoría elegida o de todas), marca «Visto» con la fecha de la última consulta en cada tarjeta y el filtro «Solo pendientes» |
| `#/aprendizaje/{id}` | `pages/ContenidoDetalle.tsx` | `ms07:content:read` o `ms07:content:manage` | Lee el contenido y registra la consulta en el progreso (`POST /contents/{id}/views`; si falla, no interrumpe la lectura). Si ya lo había consultado, dice «Consultado por primera vez el …» |
| `#/admin/aprendizaje` | `pages/AdminContenidos.tsx` | `ms07:content:manage` | Crear, modificar, inactivar y reactivar contenidos y categorías (editores en `components/EditorContenido.tsx` y `components/EditorCategoria.tsx`) |
| `#/evaluaciones` | `pages/Evaluaciones.tsx` | `ms07:quiz:take` | Evaluaciones activas, con filtro por categoría |
| `#/evaluaciones/{id}` | `pages/PresentarEvaluacion.tsx` | `ms07:quiz:take` | Presentar la evaluación y ver el puntaje con la corrección; se puede repetir |
| `#/mi-progreso` | `pages/MiProgreso.tsx` | `ms07:quiz:take` | Avance por categoría (contenidos vistos y promedio de los mejores puntajes), mejor resultado de cada evaluación y contenidos consultados; lo inactivado después sale como «No disponible» |
| `#/tutor` | `pages/Tutor.tsx` | `ms07:tutor:use` | Chat con el Tutor CampusSeguro (RF-15) sobre cualquier emergencia del campus que esté en los contenidos (sismos, incendios, fugas o derrames, evacuación, lesionados y prevención por tipo de espacio): preguntas sugeridas variadas, respuesta con los contenidos usados como fuente (enlazan a `#/aprendizaje/{id}`), mensaje amable cuando la pregunta no es del tema o los contenidos no la cubren (con el protocolo oficial y dos preguntas de ejemplo), y botón Reintentar si la IA no responde a tiempo o si se superó el límite de preguntas (429) |
| `#/admin/evaluaciones` | `pages/AdminEvaluaciones.tsx` | `ms07:content:manage` | Crear, modificar, inactivar y reactivar evaluaciones (editor en `components/EditorEvaluacion.tsx`), con «Generar con IA» para llenar el formulario con un borrador (`components/GeneradorIa.tsx`) |

Las pantallas y el menú se muestran por permiso del token, nunca por nombre de rol. Nada se borra: lo inactivo solo
deja de verse para la comunidad. Una evaluación que ya tiene intentos no se puede modificar (MS07 responde 409): hay
que inactivarla y crear otra. El cuerpo de un contenido es texto plano.

**Tutor:** Enter envía y Shift + Enter hace un salto de línea; la pregunta tiene máximo 500 caracteres. La conversación
se guarda solo en el `sessionStorage` de la pestaña (para no perderla al abrir una fuente y volver) y se borra con
«Nueva conversación» o al cerrar la pestaña; MS07 nunca guarda el texto de las preguntas ni de las respuestas.
Los saludos, agradecimientos y preguntas sobre el propio tutor («hola», «gracias», «¿qué puedes hacer?») se responden
en el navegador sin llamar a MS07 (`utils/tutorLocal.ts`, fase 1 del patrón Two-Phase Predictions del repositorio
aaintegration); todo lo demás lo responde el tutor con los contenidos oficiales. MS07 limita las preguntas por
usuario (10 por minuto y 100 por día por defecto): al superarlo responde 429 y el chat muestra «Hizo varias preguntas
seguidas. Espere un momento y vuelva a intentarlo.» con el botón Reintentar. MS07 quita los datos personales de la
pregunta antes de enviarla a la IA, pero es mejor no escribirlos.

**Progreso en el centro de aprendizaje (RF-13):** `#/aprendizaje` y `#/aprendizaje/{id}` consultan
`GET /api/v1/training/progress/me` solo si la sesión tiene `ms07:quiz:take`; si no, la pantalla sigue igual. Y es el
`total_elementos` del listado y X son los contenidos consultados que siguen activos en ese mismo grupo. «Solo
pendientes» filtra en el navegador, así que solo se ofrece cuando todos los contenidos caben en una página. En el
detalle, el progreso se lee antes de registrar la visita, para que «primera vez» sea de una visita anterior. Si la
consulta de progreso falla, la lista y el detalle se muestran igual, sin barra, marcas ni mensaje de error.

**Generar con IA (RF-14):** en el editor de evaluaciones, quien tiene `ms07:content:manage` elige la categoría y el
número de preguntas (3 a 10, 5 por defecto) y pulsa «Generar con IA». El botón está deshabilitado sin categoría.
El front pide el borrador (`POST /api/v1/training/evaluation-drafts`, 202) y lo consulta cada 1,5 s
(`GET /evaluation-drafts/{id}`) hasta que queda `LISTO` o `FALLIDO`, con un máximo de unos 60 s; mientras tanto
muestra el estado y un botón Cancelar que deja de consultar. Generar es asíncrono porque escribir varias preguntas
puede tardar más que el tiempo del Gateway. Con `LISTO` llena el título, el tema y las preguntas con la opción
correcta marcada, y muestra el aviso «Revise y ajuste las preguntas antes de guardar: las generó la IA a partir de los
contenidos oficiales». Nada se guarda solo: el ADMIN guarda con «Guardar evaluación». Si el formulario ya tenía
contenido, antes de generar se pide confirmación con el diálogo de la página (`confirmar`, no `window.confirm`).
Los errores muestran el mensaje de MS07; el 429 (5 borradores por hora) muestra un texto amable.

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/training.ts` | Cliente de MS07 por el API Gateway |
| `styles/` | Estilos del módulo (prefijo `evl-` para evaluaciones, `ap-` para contenidos y `tu-` para el tutor) |
| `utils/` | Funciones auxiliares del módulo |
| `hooks/` | Hooks propios del módulo |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
