# MS08 · Analítica y auditoría

**Alcance:** auditoría (solo lectura) e indicadores de cada evento, calculados por MS08 a partir de los hechos auditados.

**Estado:** conectado al backend de MS08 (rama `feat/service-implementation` del repositorio `ms08-analytics-and-audit`) por las rutas del Gateway `/api/v1/audit/**` y `/api/v1/analytics/**`.

| Ruta | Pantalla | Permisos (claim `permissions` del JWT; basta uno) |
|---|---|---|
| `#/auditoria` | Tabla de registros con filtros y paginación del servidor | `ms08:audit_drill:read`, `ms08:audit_real_event:read` |
| `#/indicadores` | Lista de eventos (de MS06) para elegir el resumen | `ms08:indicators_drill:read`, `ms08:indicators_real_event:read` |
| `#/indicadores/{eventoId}` | Resumen de indicadores del evento | Los mismos de `#/indicadores` |
| `#/indicadores/comparar/{id1,id2,…}` | Comparación de 2 a 10 eventos del mismo tipo, con el cambio frente al anterior | Los mismos de `#/indicadores` |
| `#/indicadores/ubicaciones/{id1,…}` | Incidentes, solicitudes de asistencia y tiempo de atención por edificio o zona (1 a 10 eventos) | Los mismos de `#/indicadores` |

Permisos iniciales (siembra de MS01): el coordinador tiene los de eventos reales; el organizador, los de simulacros; el administrador y el auditor, los cuatro.

## Reglas

- **Visibilidad por permisos, no por rol.** Los permisos de cada pantalla están en `routes.tsx` (`AUDIT_PERMISSIONS`, `INDICATORS_PERMISSIONS`) y el menú usa los mismos.
- **El front no filtra datos.** MS08 devuelve solo los registros del tipo que permite cada permiso. Los registros administrativos (sin evento, como un inicio de sesión) requieren los dos permisos de auditoría. Pedir los indicadores de un evento de otro tipo responde 403.
- **Auditoría de solo lectura.** La colección es append-only: no hay acciones de editar ni borrar.
- **Fechas.** El servicio trabaja en UTC y la pantalla muestra la hora de Bogotá. "Desde" y "Hasta" son días de Bogotá y se envían como el inicio y el fin del día en UTC; MS08 incluye los dos extremos.
- **Errores.** Formato estándar 7.1 con el `correlation_id` siempre visible para soporte. Un 400 de MS08 marca el filtro que rechazó.
- **Varios eventos.** En `#/indicadores` se marcan eventos finalizados del mismo tipo (hasta 10) para compararlos o verlos por ubicación; la selección se conserva al cambiar de página. Si alguno no tiene datos en MS08 (404), la consulta completa falla y la pantalla pide quitarlo.
- **Pendiente de cálculo.** Si el evento no ha finalizado, no se consulta a MS08. Si MS08 responde 404 (aún no recibió hechos del evento), también se muestra como pendiente. MS08 calcula en cada consulta, así que los hechos que llegan tarde se incluyen solos.

## Contrato (MS08)

```
GET /api/v1/audit/events?desde&hasta&modulo&accion&usuario_id&evento_id&tipo_evento&correlation_id&page&size
→ { contenido: [registro], page, size, total_elementos, total_paginas }   (más recientes primero; size ≤ 100)
registro = id, usuario_id, modulo, accion, recurso_afectado, resultado, fecha_hora, recibido_en,
           correlation_id, detalle, evento_id, tipo_evento (SIMULACRO | REAL | null), atributos

GET /api/v1/analytics/events/{eventoId}
→ { evento_id, tipo_evento, calculado_en, inicio_evento,
    notificacion:  { destinatarios, enviados, fallidos, confirmados, porcentaje_confirmacion },
    participacion: { participantes, porcentaje_participacion, por_estado[], puntos_encuentro[],
                     solicitaron_asistencia, porcentaje_asistencia },
    incidentes:    { total, por_categoria[] },
    tiempos:       { hasta_checkin, evacuacion, hasta_primera_atencion, ubicaciones_mas_lentas[] } }
```

Los porcentajes van de 0 a 100 y los tiempos en segundos; ambos son `null` cuando no hay con qué calcular, y la pantalla muestra "—". ```
GET /api/v1/analytics/comparisons?evento_id=a&evento_id=b   (2 a 10, del mismo tipo)
→ { eventos: [{ evento_id, tipo_evento, inicio_evento, participantes, porcentaje_participacion,
                porcentaje_confirmacion, porcentaje_asistencia, incidentes, hasta_checkin_segundos,
                evacuacion_segundos, hasta_primera_atencion_segundos, cambio_vs_anterior }] }

GET /api/v1/analytics/locations?evento_id=a[&evento_id=b…]  (1 a 10, del mismo tipo)
→ { ubicaciones: [{ ubicacion_tipo, ubicacion_id, incidentes, solicitudes_asistencia,
                    hasta_primera_atencion: { promedio_segundos, muestras }, por_evento[] }] }
```

| Carpeta | Contenido |
|---|---|
| `pages/` | `Auditoria.tsx`, `Indicadores.tsx`, `Comparacion.tsx`, `Ubicaciones.tsx` |
| `components/` | `ErrorNotice.tsx` (error con correlation_id) |
| `hooks/` | `useEventNames.ts`: nombres de los eventos (de MS06) para las pantallas de varios eventos |
| `services/` | `analytics.ts`: cliente de MS08 por el Gateway |
| `utils/` | Fechas en hora de Bogotá, etiquetas y formatos |
| `styles/` | `analytics.css` (se apoya en los estilos de Eventos) |
| `types.ts` | Tipos del módulo |
| `routes.tsx` | Rutas y permisos, encadenadas en `src/app/App.tsx` |
