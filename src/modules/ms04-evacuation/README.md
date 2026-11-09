# MS04 · Evacuación y check-in

**Alcance:** Reporte del estado de las personas durante un simulacro o emergencia.

**Estado:** RF-MS04-01 a RF-MS04-04 implementados. Contrato: `documentation/ms04-evacuation-check-in` (API `/api/v1/chi/eventos`, por el API Gateway).

## Pantallas

| Ruta | Pantalla | Requerimiento |
|---|---|---|
| `#/checkin` | Eventos activos que le aplican al usuario. Sin eventos: "No hay ningún evento activo."; con uno solo abre directo su reporte; con varios, el usuario elige | RF-MS04-01 |
| `#/checkin/{eventoId}` | Reporte de estado (F-01): estado vigente del usuario y las cuatro opciones para registrarlo o cambiarlo | RF-MS04-02, RF-MS04-03, RF-MS04-04 |

Solo los roles de la comunidad (`ms04:checkin:write`) ven estas pantallas; ADMIN y AUDITOR no tienen permisos de check-in. Se entra desde el menú: **Emergencia › Reportar mi estado**.

## Flujo del reporte (F-01)

| Estado | Qué pide | Qué se envía a MS04 |
|---|---|---|
| Estoy a salvo | El punto de encuentro (MS02, solo los activos marcados como punto de encuentro) | `{ estado: SAFE, punto_encuentro_id }` |
| Me estoy evacuando | Nada | `{ estado: EVACUATING }` |
| Requiero asistencia | El tipo de lugar (edificio, espacio o punto de encuentro) y el lugar de MS02; un espacio se elige dentro de su edificio | `{ estado: NEEDS_ASSISTANCE, ubicacion: { tipo, id } }` |
| No estoy en el campus | Nada | `{ estado: OFF_CAMPUS }` |

* Elegir un estado sin datos lo envía; con Estoy a salvo y Requiero asistencia lo envía elegir el lugar. Así Estoy a salvo se completa en 3 interacciones desde el menú (RNF-MS04-07).
* Repetir el estado vigente no crea un check-in nuevo: MS04 responde con el vigente.
* Con Requiero asistencia, el mensaje depende de la solicitud en MS05: ENVIADA, PENDIENTE_ENVIO (MS04 la reenvía cuando MS05 se recupera) o RECHAZADA (la revisa un coordinador). El estado vigente muestra cómo va la solicitud.
* Los errores de MS04 se muestran con su mensaje, por ejemplo 409 "El check-in de este evento no está habilitado." o 422 "Este evento no le aplica."

## Dependencias

| Servicio | Rutas que usa el módulo |
|---|---|
| MS04 | `GET /api/v1/chi/eventos/activos`, `POST /api/v1/chi/eventos/{id}/checkins`, `GET /api/v1/chi/eventos/{id}/checkins/propio` |
| MS02 | `GET /api/v1/safe-zones?puntoEncuentro=true`, `GET /api/v1/safe-zones/{id}`, `GET /api/v1/buildings`, `GET /api/v1/buildings/{id}`, `GET /api/v1/buildings/{id}/spaces`, `GET /api/v1/spaces/{id}` |

El API Gateway debe enrutar `/api/v1/chi/**` a MS04 y las rutas anteriores a MS02.

## Carpetas

| Carpeta | Contenido |
|---|---|
| `pages/` | `EventosActivos.tsx` y `ReporteEstado.tsx` |
| `components/` | `SelectorUbicacion.tsx`: lugar de Requiero asistencia |
| `services/` | `checkin.ts`: cliente de MS04; `campus.ts`: consultas de solo lectura a MS02. Ambos por el API Gateway |
| `hooks/` | Hooks propios del módulo |
| `utils/` | `labels.ts`: textos, mensajes de F-01 y formato de fechas |
| `styles/` | `checkin.css`: estilos propios (prefijo `chk-`) |
| `types.ts` | Tipos del contrato de MS04 y de lo que se usa de MS02 |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
