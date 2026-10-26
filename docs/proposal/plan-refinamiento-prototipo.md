# Plan de refinamiento del prototipo de alta fidelidad

**Fecha:** 26 de octubre de 2026
**Alcance:** mejorar el prototipo React/TypeScript existente para que sus pantallas, datos de demostración y recorridos sean coherentes y presentables en una validación con usuarios.

## 1. Estado de partida

El prototipo ya contiene navegación y vistas para resumen, inventario, productos, movimientos, compras, organización, asignaciones, inspecciones, mantenimiento, reportes, auditoría, notificaciones y configuración. Hay formularios y algunos flujos conectados entre sí; por ejemplo, la recepción puede crear productos, existencias y activos serializados. Los datos se guardan en `localStorage` y las listas iniciales son datos de demostración.

El principal refinamiento pendiente es hacer que la experiencia se comporte como un producto coherente de extremo a extremo: evitar acciones que solo muestren una confirmación sin actualizar el estado de negocio relacionado, consolidar reglas compartidas, dar retroalimentación clara y asegurar que cada ruta se entienda y funcione en escritorio y móvil. La persistencia local es útil para una demo, pero no equivale a backend, multiusuario ni seguridad.

## 2. Resultado esperado

Entregar un prototipo demostrable donde un usuario pueda completar los recorridos prioritarios sin instrucciones del equipo, entienda qué cambió después de cada acción y pueda recuperar el estado de demostración. Las vistas deben adaptarse a móvil, teclado y lector de pantalla en los controles importantes; los datos derivados deben ser consistentes entre módulos.

## 3. Prioridades

1. **P0 — Consistencia de los recorridos centrales:** producto, recepción, existencias, seriales, movimientos y asignación/devolución.
2. **P1 — Claridad y acabado de interfaz:** formularios, estados vacíos, errores, confirmaciones, navegación móvil y accesibilidad básica.
3. **P2 — Cobertura de módulos de gestión:** organización, inspecciones y mantenimiento con transiciones y trazabilidad conectadas.
4. **P3 — Demostración y salida de datos:** reportes reconocibles, filtros útiles, auditoría legible, reinicio de demo y guía de recorrido.

## 4. Plan por etapas

Estimación de referencia para una persona, con asistencia de dos modelos de Codex y revisión humana continua. Total: **273 horas efectivas**, aproximadamente **6,5 semanas a 42 horas por semana**. Las horas son de trabajo del proyecto, no una garantía de fecha; se deben reajustar al validar cada etapa.

| Etapa | Horas | Trabajo | Entregable y criterio de aceptación |
|---|---:|---|---|
| 0. Alcance y diagnóstico | 16 | Definir persona principal, escenarios de demo, reglas del prototipo, datos iniciales y decisiones que requieren confirmación. Inventariar acciones que hoy solo notifican, formularios y dependencias entre páginas. | Lista priorizada de recorridos y criterios de aceptación aprobables; límites de demo visibles para el equipo. |
| 1. Sistema visual y estructura | 32 | Unificar escalas de espaciado, tipografía, color semántico, botones, campos, tarjetas, estados, diálogos y tablas. Revisar jerarquía de navegación, diseño adaptable y consistencia de encabezados. | Todas las rutas usan patrones visuales comunes; navegación utilizable en móvil, estados de foco visibles y contenido sin desbordamiento horizontal en anchos acordados. |
| 2. Base funcional del prototipo | 38 | Separar reglas de negocio de componentes, tipar estados y transiciones, normalizar formatos y referencias, centralizar persistencia de demo, manejar errores de almacenamiento y añadir una acción explícita para restaurar los datos de ejemplo. | Acciones repetidas no duplican registros; recargar conserva cambios; restaurar demo vuelve a un estado conocido y muestra qué se perderá antes de hacerlo. |
| 3. Recorrido de compras e inventario | 60 | Completar orden/recepción parcial y total, registrar líneas nuevas o de catálogo, cantidad recibida y rechazada, costo/ubicación, seriales únicos para control individual, actualización de stock, creación de activos y movimiento de ingreso. | Un recorrido de recepción actualiza una sola vez producto, unidades/activos y movimientos; serial repetido o cantidad inválida se rechaza y explica cómo corregirla. |
| 4. Recorrido de custodia y mantenimiento | 38 | Conectar disponibilidad, asignación, responsable/grupo, devolución y traslado. Relacionar inspecciones e incidencias con el estado de un activo; cerrar mantenimiento antes de devolver disponibilidad cuando aplique. | No se asigna dos veces el mismo activo; devolución deja historial; una restricción abierta se refleja en las acciones disponibles y su resolución deja trazabilidad. |
| 5. Módulos secundarios y analítica de demo | 36 | Completar acciones de organización, usuarios/grupos/ubicaciones, agenda de inspecciones, órdenes de mantenimiento, notificaciones y reportes. Identificar qué cifras son datos semilla y cuáles se calculan desde cambios locales. | Las tablas, tarjetas, filtros y exportaciones corresponden a la misma fuente local; las transiciones actualizan los módulos relacionados o se marcan claramente como demostrativas. |
| 6. Revisión con usuarios y cierre | 53 | Recorrer escenarios, corregir fricciones, revisar accesibilidad básica y diseño adaptable, completar datos vacíos y errores, validar exportación CSV y persistencia, preparar guion de demo y documentar límites conocidos. | Checklist de aceptación completado para cada ruta incluida; escenarios pasan manualmente en escritorio y móvil; build de producción generado y guía de demo entregada. |
| **Total** | **273** |  |  |

## 5. Recorridos de validación

### A. Alta y recepción

1. Crear o elegir una orden de compra.
2. Recibir parcialmente una línea del catálogo y crear otra línea con un producto nuevo.
3. En control por cantidad, ingresar unidades y verificar el stock resultante.
4. En control individual, ingresar un serial por unidad; probar duplicado, faltante y exceso.
5. Confirmar que la recepción crea el movimiento y actualiza el resumen y los reportes relacionados.

### B. Custodia del activo

1. Buscar un activo disponible por código, producto o serial.
2. Asignarlo a una persona o grupo y verificar que deja de estar disponible.
3. Intentar asignarlo otra vez y comprobar que el sistema explica el bloqueo.
4. Devolverlo y confirmar el historial de custodia y el nuevo estado.

### C. Incidencia y mantenimiento

1. Abrir una inspección y registrar su resultado.
2. Reportar una incidencia y relacionarla con el activo.
3. Crear y completar una orden de mantenimiento.
4. Verificar que la restricción y disponibilidad se actualizan con la transición definida.

### D. Reporte y auditoría

1. Filtrar un periodo y un tipo de movimiento.
2. Comparar las cifras del reporte con las listas de movimientos y activos.
3. Exportar CSV y verificar encabezados, caracteres en español y filtros aplicados.
4. Consultar el registro de actividad y distinguir claramente eventos reales del demo de datos semilla.

## 6. Reglas de experiencia y calidad

- Los formularios indican campos requeridos, límites y errores junto al campo; conservan valores cuando hay un error recuperable.
- Las operaciones destructivas o que reinician la demo muestran una confirmación con efecto explícito.
- Los botones deshabilitados explican la condición que falta; cada envío bloquea dobles clics mientras se procesa.
- Cada vista contempla carga, lista vacía, búsqueda sin coincidencias, error y éxito.
- Diálogos permiten cerrar con Escape, mantienen el foco y lo devuelven al control de apertura; el foco siempre es visible.
- Estados se expresan con texto y color, no solo con color. Tablas mantienen etiquetas comprensibles en pantallas pequeñas.
- Persistencia local se identifica como “datos de demostración en este navegador”; no se presentan permisos, identidad, auditoría ni sincronización como reales.
- Datos agregados se calculan desde las entidades de demostración; si son estáticos, se rotulan como muestra.

## 7. Fuera del alcance de este refinamiento

Este plan termina en un prototipo de frontend robusto para demostración y validación de flujos. No incluye microservicios productivos, autenticación/autorización real, bases de datos, sincronización multiusuario, RabbitMQ, API Gateway conectada, despliegue con SLA, migración de datos, integraciones con ERP ni cumplimiento operativo. Esos componentes pertenecen a la hoja de ruta de implementación de la plataforma y requieren estimación aparte.

## 8. Seguimiento

Al inicio de cada etapa se acuerdan sus escenarios y datos semilla; al cierre se registra qué criterios pasaron, qué quedó pendiente y la estimación restante. Se recomienda una revisión breve con usuarios al final de las etapas 3, 4 y 6. Los cambios de alcance se priorizan contra las 273 horas y se negocian moviendo otras tareas, no suponiendo tiempo adicional invisible.

### Registro de ejecución

- [x] Diagnóstico inicial de rutas, módulos de estado y almacenamiento del prototipo.
- [x] Centralizar lectura y escritura de snapshots de demostración; notificar errores de almacenamiento.
- [x] Guardar productos, activos y movimientos de recepción/registro como una operación coordinada con restauración best-effort ante error.
- [x] Añadir restauración confirmada de los datos iniciales en Configuración y explicar el alcance local del prototipo en todas las vistas.
- [x] Coordinar en una misma escritura local los cambios de asignación/devolución con su movimiento y sincronizar activos al abrir o cerrar una orden de mantenimiento.
- [x] Capturar resultado/evidencia de inspección; bloquear activos en hallazgos críticos y exigir nota para resolver/liberar.
- [x] Crear órdenes multi-línea desde catálogo, calcular su total y relacionar recepciones con cantidades pendientes; impedir sobre-recibir y cerrar la orden solo cuando todas las líneas se completan.
- [x] Recorrer en navegador aislado una recepción parcial y total, comprobar saldo y stock tras recarga, registrar un activo serializado, rechazar serial duplicado y rechazar exceso de recepción; restaurar después los datos semilla del entorno de prueba.
- [x] Recorrer devolución y disponibilidad; registrar incidencia crítica, comprobar bloqueo, exigir evidencia de resolución y recuperar el estado anterior; crear y completar una orden de mantenimiento verificando la propagación de estado.
- [x] Sustituir la serie ficticia del resumen por agregaciones de los movimientos locales para semana/mes/trimestre, retirar porcentajes inventados y hacer dinámica la fecha del resumen.
- [x] Añadir estados vacíos para activos, productos, movimientos, inspecciones y mantenimiento con instrucciones para recuperarse.
- [x] Ajustar el resumen para eliminar cifras de comparación inventadas; formatear la fecha desde el reloj local y separar dependencias del bundle para que ningún chunk de producción supere 500 kB.
- [x] Crear la guía del recorrido y los límites de la demo en `docs/proposal/guia-demo-prototipo.md`.
- [x] Auditar las 12 rutas a 320 px y 390 px: el documento no presenta desbordamiento horizontal; tablas, pestañas y filtros largos se desplazan dentro de sus contenedores.
- [x] Revisar navegación móvil cerrada/abierta en el árbol de accesibilidad y confirmar que el menú cerrado no expone enlaces ocultos.
- [x] Verificar con teclado Escape, trampa de foco y retorno al control de origen en el detalle de activo y su formulario anidado de movimiento; añadir foco visible y apertura de filas de activos con Enter/Espacio.
- [x] Auditar nombres accesibles en las 13 rutas y en 10 diálogos de alta/configuración; añadir `aria-label` descriptivos a las ocho búsquedas que dependían solo del placeholder. No se detectaron controles de formulario sin nombre accesible en las vistas revisadas.
- [x] Mejorar la validación de los formularios compartidos: llevar el foco al primer campo inválido, asociar el mensaje con `aria-describedby`, marcar el control con `aria-invalid`, validar restricciones HTML dentro del flujo accesible y bloquear envíos repetidos durante operaciones asíncronas.
- [x] Generar fechas y horas iniciales de formularios desde la hora local del navegador, evitando que el desplazamiento UTC cambie el día mostrado en compras, inspecciones y mantenimiento.
- [x] Completar estados vacíos informativos en compras, asignaciones y los listados de grupos y ubicaciones de Organización, distinguiendo entre falta de datos y filtros sin coincidencias.
- [x] Llevar al primer campo inválido y asociar sus mensajes en el editor de órdenes de compra; bloquear envíos repetidos y conservar el formulario si falla el guardado.
- [x] Añadir a la guía un registro único de aceptación humana para ejecutar los recorridos integrados y dejar observaciones y aprobación en una sola sesión.
- [x] Revisar el árbol de accesibilidad del navegador en las 13 rutas y 10 diálogos: un encabezado principal, sin IDs duplicados y nombres accesibles en los controles revisados; además, confirmar asociación de errores y foco en formularios prioritarios.
- [x] Cerrar sin sesión de aceptación del solicitante, por su instrucción explícita de terminar sin su validación; usar las evidencias de los recorridos previos y registrar el límite de no haber ejecutado un lector de pantalla real.
- [x] Inspeccionar el contenido descargado de los ocho CSV: encabezados, BOM UTF-8, caracteres en español, filas esperadas y correspondencia de inventario por ubicación.
- [x] Generar alertas desde existencias, inspecciones vencidas/incidencias abiertas, entregas o firmas pendientes y órdenes sin aprobar/recibir; sincronizar contador lateral, respetar preferencias y conservar estado leído por entidad.
- [x] Comprobar en el origen aislado que una recepción parcial quita una alerta de mínimo al cruzar el stock requerido, que el contador lateral refleja el total no leído y que desactivar alertas de stock elimina solo esa categoría.
- [x] Conectar grupos de Organización con el selector de nueva asignación y sedes registradas con los formularios de producto, activo y ficha nueva en recepción; comprobar en navegador aislado que los nuevos registros aparecen como opciones.
- [x] Documentar las advertencias de anotaciones `@__PURE__` heredadas de Zod y conservarlas: Rollup elimina esos comentarios al compilar y no afectan el resultado, la funcionalidad ni los límites de tamaño.
- [x] Cerrar los recorridos con revisión interna y las evidencias de navegador disponibles; el solicitante pidió omitir su validación y no se atribuye una aprobación humana que no ocurrió.

**Verificación final única:** `npm run build` terminó correctamente después de los cambios de código; `tsc -b` y Vite finalizaron sin errores. Los chunks de JavaScript quedaron en 21, 41, 118, 178 y 223 kB, ninguno supera 500 kB. Las modificaciones posteriores de la guía y este registro son documentación. Los recorridos de recepción, custodia, inspección/mantenimiento, reportes, CSV, persistencia, responsive y controles de teclado tienen evidencias registradas arriba. Rollup conserva avisos de anotaciones `@__PURE__` heredadas de Zod; se documentaron y no impiden compilar. La revisión semántica se apoyó en el árbol AX del navegador; no se ejecutó software de lector de pantalla real y este límite queda explícito.

**Accesibilidad y alcance de aceptación:** se comprobó la estructura del árbol AX en 13 rutas y 10 diálogos, con controles nombrados y errores relacionados en formularios prioritarios. Esto no certifica la experiencia hablada de NVDA, Narrador o VoiceOver. Por instrucción explícita del solicitante, la aceptación no espera su revisión; las evidencias internas se conservan sin atribuirle una aprobación.

**Validación accesible de formularios:** build de TypeScript/producción correcto. En navegador, el envío incompleto de una asignación enfocó el selector de activo, lo marcó inválido y relacionó la alerta con el control; el envío incompleto de una orden enfocó el área de novedad y anunció el mismo patrón. Los formularios compartidos ya tienen guarda síncrona contra doble envío y estado visual de guardado mientras resuelven operaciones asíncronas.

**Fechas locales:** los valores iniciales de los campos `date` y `datetime-local` se componen con año, mes, día y hora locales en lugar de recortar una cadena UTC; forman parte de la compilación final indicada arriba.

El plan de refinamiento queda cerrado como prototipo de frontend para demostración. No representa una plataforma productiva: autenticación, backend, microservicios, bases de datos y sincronización multiusuario siguen fuera del alcance descrito en la sección 7.
