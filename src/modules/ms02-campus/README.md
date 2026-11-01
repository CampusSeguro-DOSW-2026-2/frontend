# MS02 · Campus y seguridad

**Alcance:** Edificios, espacios, zonas seguras, puntos de encuentro y rutas de evacuación.

**Estado:** Pendiente de integrar: la rama `feature/MS02-Campus` trae las pantallas; ver la tabla de `docs/ESTRUCTURA.md`.

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/` | Llamadas a su microservicio o datos locales mientras no haya contrato |
| `hooks/` | Hooks propios del módulo |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
