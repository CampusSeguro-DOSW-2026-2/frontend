# MS01 · Identidad y acceso

**Alcance:** Registro, inicio y cierre de sesión, recuperación y cambio de contraseña, perfil, usuarios, roles y permisos.

**Estado:** Conectado al API Gateway (`shared/services/http.ts`).

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/` | Llamadas a su microservicio o datos locales mientras no haya contrato |
| `hooks/` | Hooks propios del módulo |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
