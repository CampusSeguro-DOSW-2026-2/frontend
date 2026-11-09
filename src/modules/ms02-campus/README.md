# MS02 · Campus y seguridad

**Alcance:** Edificios, espacios, zonas seguras, puntos de encuentro y rutas de evacuación.

**Estado:** Integrado. Pantallas:

| Ruta | Pantalla | Rol |
|---|---|---|
| `#/rutas` | Consultar ruta de evacuación | Todos |
| `#/admin/edificios` | Edificios | ADMIN; COORDINADOR consulta |
| `#/admin/edificios/{id}` | Detalle de edificio: pisos, espacios y salidas, con el QR de cada uno | ADMIN |
| `#/admin/edificios/{id}/qr` | Hoja imprimible con los QR de las salidas y espacios del edificio | ADMIN |
| `#/admin/zonas` | Zonas seguras, con el QR de cada una | ADMIN |
| `#/admin/rutas` | Rutas de evacuación | ADMIN; COORDINADOR cambia el estado |
| `#/admin/preventiva` | Información preventiva | ADMIN |
| `#/qr/{espacios\|salidas\|zonas}/{id}` | Lo que se ve al escanear un QR: lugar y guía de evacuación | Pública, sin sesión |

Todas las llamadas pasan por `services/campus.ts`, que usa `request` de `shared/services/http.ts` con la sesión común. Las imágenes de los QR se descargan aparte (`descargarQr`) porque `request` solo lee JSON, y la pantalla `#/qr/…` llama a `/api/v1/public/…` sin token. Las rutas `#/qr/…` se declaran públicas con `esRutaPublicaCampus` en `routes.tsx`.

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/` | Llamadas a su microservicio o datos locales mientras no haya contrato |
| `hooks/` | Hooks propios del módulo |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
