# MS03 · Alertas y emergencias

**Alcance:** Crear, programar, activar y archivar alertas; bandeja personal y confirmación de recepción de los destinatarios.

**Estado:** Conectado a MS03 a través del API Gateway (`services/ms03.ts` usa el cliente compartido), contrato v3.0.0 en `ms03-alerts-and-emergencies/docs/api/openapi.yaml`. Ciclo de vida: BORRADOR → PROGRAMADA → ACTIVA → ARCHIVADA. `permissions.ts` oculta las acciones según el rol (el backend sigue siendo quien decide).

| Carpeta | Contenido |
|---|---|
| `pages/` | Pantallas (una por ruta) |
| `components/` | Componentes que solo usa este módulo |
| `services/` | Llamadas a su microservicio o datos locales mientras no haya contrato |
| `hooks/` | Hooks propios del módulo |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas del módulo, encadenadas en `src/app/App.tsx` |

Lo que también usen otros módulos va en `src/shared/` (ver `docs/ESTRUCTURA.md`).
