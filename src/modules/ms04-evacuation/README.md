# MS04 · Evacuación y check-in

**Alcance:** Reporte del estado de las personas y consolidado por punto de encuentro.

**Estado:** En implementación. Contrato: `documentation/ms04-evacuation-check-in` (API `/api/v1/chi/eventos`, por el API Gateway).

| Ruta | Pantalla | Requerimiento |
|---|---|---|
| `#/checkin` | Eventos activos que le aplican al usuario. Con uno solo abre directo su reporte | RF-MS04-01 |
| `#/checkin/{eventoId}` | Reporte de estado (F-01): estado vigente y las cuatro opciones; Estoy a salvo pide el punto de encuentro de MS02 | RF-MS04-02, RF-MS04-03 |
| `#/evacuacion/eventos` | Lista de eventos en cualquier estado, con filtro por estado y paginación (F-07). Solo lectura | RF-MS04-13 |

La lista de eventos la ven BRIGADISTA, COORDINADOR, ORGANIZADOR y AUDITOR (`ms04:dashboard:read`).

El reporte se completa en máximo 3 interacciones desde el menú (RNF-MS04-07): elegir un estado lo envía, y con Estoy a salvo lo envía elegir el punto de encuentro. Requiero asistencia aparece deshabilitada hasta implementar su ubicación (RF-MS04-04).

Solo los roles de la comunidad (`ms04:checkin:write`) ven estas pantallas; ADMIN y AUDITOR no tienen permisos de check-in.

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/` | `checkin.ts`: cliente de MS04; `campus.ts`: consultas de solo lectura a MS02 (puntos de encuentro). Ambos por el API Gateway |
| `hooks/` | Hooks propios del módulo |
| `utils/` | `labels.ts`: textos y formato de fechas |
| `styles/` | `checkin.css`: estilos propios (prefijo `chk-`) |
| `types.ts` | Tipos del contrato de MS04 |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
