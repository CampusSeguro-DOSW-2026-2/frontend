# Patrones de interfaz

Guía común para todos los módulos. Lo compartido vive en `src/shared` (ver [ESTRUCTURA.md](ESTRUCTURA.md)); cada módulo
usa estas piezas en vez de crear las suyas.

## Componentes compartidos

| Necesidad | Componente | Uso |
|---|---|---|
| Éxito, error, aviso o información en la pantalla | `shared/components/Mensaje.tsx` | `<Mensaje tono="error" error={err} onReintentar={cargar} />` |
| Lista o búsqueda sin resultados | `shared/components/EstadoVacio.tsx` | `<EstadoVacio titulo="No hay alertas activas">Cuando se emita una, aparecerá aquí.</EstadoVacio>` |
| Primera carga de una pantalla o sección | `shared/components/Cargando.tsx` | `<Cargando texto="Cargando alertas…" />` |
| Datos visibles que se actualizan | clase `actualizando` + `aria-busy` | `<div className="actualizando" aria-busy={cargando}>…</div>` (barra fina, no vacía la pantalla) |
| Confirmar una acción de alto impacto | `confirmar()` de `shared/services/feedback.ts` | `if (await confirmar({ titulo: '¿Archivar la alerta?', accion: 'Archivar alerta', peligro: true })) …` |
| Avisar que algo salió bien (con «Deshacer» opcional) | `avisar()` de `shared/services/feedback.ts` | `avisar({ tono: 'exito', texto: 'Edificio inactivado.', deshacer: () => reactivar(id) })` |
| Campo de formulario | `shared/components/Campo.tsx` | Etiqueta, ayuda, error, opcional y contraseña con `aria-invalid` y `aria-describedby` |
| Fecha y hora | `shared/components/DateTimeField.tsx` | Formato `es-CO` («12 oct 2026 · 10:05 a. m.») |

`window.confirm` y `window.alert` no se usan.

### Cuándo confirmar

- **Sí:** acciones de alto impacto o irreversibles. Por ejemplo: emitir o archivar una alerta, finalizar un evento o un turno, desactivar usuarios (cierra sus sesiones), cambiar roles, eliminar.
- **No:** acciones reversibles como inactivar o reactivar. Se ejecutan de una vez y muestran un aviso de éxito.
- **«Deshacer»:** solo cuando el servicio del módulo ya tiene la operación inversa (inactivar ↔ reactivar). Si no existe, el aviso de éxito va sin «Deshacer»; no se agrega lógica nueva para lograrlo.
- El diálogo dice qué pasará. Su botón principal repite el verbo y el objeto («Archivar alerta»). En acciones peligrosas el foco empieza en «Cancelar».

## Pantallas

### Listado

1. **Encabezado** `ev-head`: título, una línea de contexto y **una sola** acción principal (`.btn.light.cta`).
2. **Herramientas** `ev-tools`: pestañas por estado (`ev-tabs`/`ev-tab`) y búsqueda.
3. **Tabla** `ev-table`, con un título (`.t`) y un subtítulo (`.s`) por fila. Las acciones van en `ev-acts`, con botones `.btn.sm`.
   - **En celular:** se agrega la clase `tarjetas` a la tabla, `data-label="Columna"` a cada `<td>` y `data-primera` a la celda de acciones. Así cada fila se vuelve una tarjeta con la acción arriba, sin desplazamiento horizontal.
4. Estado vacío con `EstadoVacio`. Paginación con `ev-pager`.
5. Estados con `.st.<CÓDIGO>`: en curso = aviso (ámbar), programado = información (azul), borrador = neutro, finalizado = oscuro.

### Formulario

1. `PageHeader` con «← Volver» en `context`.
2. Campos con `Campo`. Primero lo indispensable; lo opcional o avanzado va detrás de «Más opciones».
3. Una acción principal con verbo y objeto («Crear alerta», «Guardar edificio») y «Cancelar» como secundaria (`.btn.white`).
   - **En celular:** la fila de botones lleva la clase `barra-accion` y queda fija abajo.
4. Al enviar con errores, el foco va al primer campo inválido. Los errores generales van en `Mensaje`.
5. Mientras se guarda, el botón lleva `aria-busy="true"` y el texto «Guardando…».

### Detalle

1. `PageHeader` con «← Volver».
2. Las acciones de estado (editar, finalizar) van en el encabezado.
3. Primero el resumen y después las secciones en tarjetas.

## Botones

| Clase | Uso |
|---|---|
| `.btn.red` | La acción principal de la pantalla (una sola) |
| `.btn.white` | Secundaria |
| `.btn.light` | Secundaria con énfasis de marca; en `ev-head`, la acción principal sobre rojo |
| `.btn.ghost` | Terciaria, solo texto |
| `.btn.danger` | Secundaria destructiva (eliminar) |
| `.btn.sm` | Versión de 44 px para tablas, tarjetas y barras |
| `.plink` | Acción en línea («Reintentar», «Ver más»); su área táctil se amplía sin mover el texto |
| `.pill` | Segmento de filtro u opción rápida (`aria-pressed`) |

- Nada interactivo mide menos de 44 × 44 px.
- El estado deshabilitado se ve gris (no depende de la opacidad).
- Al presionar, el botón se reduce a 0,97.

## Tokens

Todos los colores están en `src/shared/styles.css` (`:root`). Los módulos no escriben colores directamente.

| Grupo | Tokens |
|---|---|
| Marca | `--red`, `--dark`, `--ink`, `--mut`, `--line`, `--bg`, `--cream`, `--amber`, `--pale`, `--blue` |
| Superficie | `--surface`, `--on-color` (texto sobre rojo u oscuro), `--live-bg`, `--scrim`, `--shadow-sm/md/lg` |
| Éxito | `--ok-bg`, `--ok-line`, `--ok` |
| Error | `--err-bg`, `--err-line`, `--err` |
| Aviso | `--warn-bg`, `--warn-line`, `--warn` |
| Información | `--info-bg`, `--info-line`, `--info` |
| Neutro | `--neutral-bg`, `--neutral-line`, `--neutral` |
| Movimiento | `--ease-out`, `--dur-press`, `--dur-ui`, `--dur-dialog` |
| Área táctil | `--tap` (44 px) |

Texto blanco sobre `--amber` no cumple el contraste AA. Para lo que está "en curso" se usa `--warn` sobre `--warn-bg`.

## Movimiento

- Solo se anima lo que da feedback o explica un cambio de estado: presionar un botón, abrir un diálogo o el menú, avisos, carga.
- Se anima solo `transform` y `opacity`, con `--ease-out`, en menos de 300 ms (diálogos 240 ms).
- No se animan las acciones repetitivas ni las del teclado.
- Con `prefers-reduced-motion: reduce` no hay desplazamientos ni escalas; quedan fundidos cortos. Para desplazarse por la página se usa `behavior: 'auto'` cuando la persona pide menos movimiento.

## Textos

- **Siempre usted:** «Elija su punto de encuentro», «Revise su conexión».
- **Botones con verbo y objeto:** «Crear alerta», «Guardar cambios», «Reportar mi estado». Evitar «Aceptar», «Ver», «Cambiar» u «OK» solos.
- **Errores con dos partes:** qué pasó y qué hacer. «No se pudo enviar su estado. Revise su conexión e intente de nuevo.»
- **Fechas y horas en `es-CO`.** Nunca `en-US`.
- **Nunca mostrar códigos crudos** (`IN_PROGRESS`, `ms07:quiz:take`): usar las etiquetas de `utils/labels.ts` de cada módulo.
- **Mayúscula solo al inicio:** «Confirmar recepción», no «Confirmar Recepción».
