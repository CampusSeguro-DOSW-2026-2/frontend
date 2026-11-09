# MS04 · Evacuación y check-in

**Alcance:** Reporte del estado de las personas y consolidado por punto de encuentro.

**Estado:** En implementación. Contrato: `documentation/ms04-evacuation-check-in` (API `/api/v1/chi/eventos`, por el API Gateway).

| Ruta | Pantalla | Requerimiento |
|---|---|---|
| `#/checkin` | Eventos activos que le aplican al usuario | RF-MS04-01 |

Solo los roles de la comunidad (`ms04:checkin:write`) ven estas pantallas; ADMIN y AUDITOR no tienen permisos de check-in.

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/` | `checkin.ts`: cliente de MS04 por el API Gateway |
| `hooks/` | Hooks propios del módulo |
| `utils/` | `labels.ts`: textos y formato de fechas |
| `styles/` | `checkin.css`: estilos propios (prefijo `chk-`) |
| `types.ts` | Tipos del contrato de MS04 |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
