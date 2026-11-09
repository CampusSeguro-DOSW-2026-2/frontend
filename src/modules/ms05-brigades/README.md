# MS05 · Brigadas e incidentes

**Alcance:** Coordinación operativa, asignación de brigadistas y gestión de incidentes.

**Estado:** Pendiente de contrato: datos locales (`services/brigades.ts`).

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/` | Llamadas a su microservicio o datos locales mientras no haya contrato |
| `hooks/` | Hooks propios del módulo |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
