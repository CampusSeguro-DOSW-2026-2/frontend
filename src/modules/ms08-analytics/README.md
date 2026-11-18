# MS08 · Analítica y auditoría

**Alcance:** auditoría (solo lectura) e indicadores que MS08 calcula al finalizar un evento.

**Estado:** pantallas listas con **contrato provisional**. MS08 aún no publica su OpenAPI; las rutas, los parámetros y la lectura de las respuestas están en `services/analytics.ts` para ajustarlos en un solo lugar.

| Ruta | Pantalla | Permiso (claim `permissions` del JWT) |
|---|---|---|
| `#/auditoria` | Tabla de registros con filtros y paginación del servidor | `ms08:audit:read` |
| `#/indicadores` | Lista de eventos (de MS06) para elegir el resumen | `ms08:indicators:read` |
| `#/indicadores/{eventoId}` | Resumen de indicadores del evento | `ms08:indicators:read` |

## Reglas

- **Visibilidad por permisos, no por rol.** Los permisos que abren cada pantalla están en `routes.tsx` (`AUDIT_PERMISSIONS`, `INDICATORS_PERMISSIONS`); el menú usa los mismos códigos.
- **El front no filtra datos.** Lo que cada usuario ve (coordinador: eventos reales; organizador: simulacros; auditor y administrador: todo) lo decide MS08 y la pantalla muestra lo que llega.
- **Auditoría de solo lectura.** La colección es append-only: no hay acciones de editar ni borrar.
- **Fechas.** El servicio trabaja en UTC; la pantalla muestra la hora de Bogotá. Los filtros "Desde" y "Hasta" son días de Bogotá y se envían como instantes UTC (inicio y fin del día).
- **Errores.** Formato estándar 7.1; siempre se muestra el `correlation_id` para soporte.
- **Pendiente de cálculo.** Si el evento no ha finalizado, MS08 responde 404 o el resumen viene sin indicadores o con estado pendiente.

## Contrato provisional

```
GET /api/v1/auditoria?desde&hasta&modulo&accion&usuario_id&evento_id&page&size
→ { contenido: [AuditRecord], page, size, total_elementos, total_paginas }
AuditRecord = campos del evento de auditoría (Estándares §12) + id y evento_id opcional

GET /api/v1/analitica/eventos/{eventoId}/indicadores
→ { evento_id, estado: CALCULADO | PENDIENTE, calculado_en, tipo_evento, indicadores: { clave: número | desglose } }
```

Las respuestas se leen en snake_case o camelCase. Los indicadores con nombre conocido se muestran con su etiqueta (`utils/format.ts`); el resto con su clave legible. Las claves que empiezan por `porcentaje` se muestran como porcentaje y las que terminan en `_segundos`, como duración.

| Carpeta | Contenido |
|---|---|
| `pages/` | `Auditoria.tsx`, `Indicadores.tsx` |
| `components/` | `ErrorNotice.tsx` (error con correlation_id) |
| `services/` | `analytics.ts`: cliente de MS08 por el Gateway |
| `utils/` | Fechas en hora de Bogotá, etiquetas y formatos |
| `styles/` | `analytics.css` (se apoya en los estilos de Eventos) |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas y permisos, encadenadas en `src/app/App.tsx` |
