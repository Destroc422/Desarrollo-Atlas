# Guía de demostración Atlas

## Antes de empezar

- Ejecuta el frontend con `npm run dev` desde `frontend/` y abre la URL local indicada por Vite.
- El prototipo guarda los cambios en el almacenamiento del navegador actual. No hay sincronización entre usuarios ni respaldo en servidor.
- Para una sesión limpia, abre **Configuración → Datos de demostración → Restaurar datos de ejemplo**. La confirmación describe que se reemplazarán los datos locales de Atlas en ese navegador.
- Usa datos ficticios. No registres información personal real en esta demo.

## Recorrido sugerido (10–15 minutos)

1. **Resumen:** explica el valor consolidado del inventario, las alertas bajo mínimo, los activos disponibles y la actividad calculada desde los movimientos registrados. Cambia el periodo del gráfico para ver semana, mes y trimestre.
2. **Catálogo:** abre **Productos**, busca por nombre o código, filtra por categoría y exporta el catálogo a CSV.
3. **Compra y recepción:** en **Compras**, abre una orden aprobada y recibe una parte. Comprueba que el saldo pendiente se recalcula y que la cantidad aceptada incrementa el stock y crea un movimiento. Repite con el saldo para cerrar la orden. El formulario bloquea el exceso de recepción.
4. **Custodia:** en **Asignaciones**, devuelve una asignación activa. En inventario, el activo debe quedar disponible y el movimiento de devolución debe aparecer en la bitácora.
5. **Inspección:** programa una revisión para un activo registrado y completa el resultado. Una incidencia crítica exige observación, bloquea el activo y permite liberarlo después de registrar la resolución.
6. **Mantenimiento:** crea una orden para un activo disponible y avanza sus estados: programado, en proceso, esperando repuesto y completado. Al completar la última orden abierta, el activo recupera su estado previo.
7. **Notificaciones:** revisa alertas derivadas del stock, inspecciones, asignaciones pendientes y órdenes de compra. Cambia una preferencia en Configuración o recibe existencias para confirmar que la lista y el contador lateral se actualizan; el estado leído se guarda en este navegador.
8. **Reportes y auditoría:** descarga un reporte CSV y compara los registros con los módulos que los originaron. La auditoría de este prototipo usa los movimientos locales como bitácora demostrativa.

## Validaciones rápidas

- Usa la búsqueda con un término inexistente y confirma que se presenta un estado vacío con una acción sugerida.
- Prueba cerrar un diálogo con **Escape** y completar una operación solo con teclado.
- En compras, verifica el catálogo, las existencias y los movimientos tras cada recepción; no asumas que una confirmación visual por sí sola actualiza los datos.
- Recarga la página para comprobar persistencia local.
- Restaura los datos de ejemplo al terminar una sesión de aceptación cuando quieras volver a las cifras iniciales.

## Registro de aceptación final — una sola sesión

Completa este registro en una sesión integrada, recorriendo los escenarios en secuencia. No es necesario ejecutar pruebas automatizadas separadas por módulo. Usa únicamente datos ficticios y restaura el demo al finalizar.

**Revisor:** ____________________  **Fecha:** ____________________  **Navegador/dispositivo:** ____________________

**Lector de pantalla y versión (si aplica):** ______________________________________________

| Recorrido integrado | Resultado (OK / Pendiente) | Observaciones o ajuste necesario |
|---|---|---|
| Crear una orden, recibir una parte y el saldo, y confirmar que existencias, activos serializados y movimientos reflejan una sola recepción. |  |  |
| Asignar y devolver un activo; verificar su disponibilidad y el historial de custodia. |  |  |
| Registrar una inspección crítica, comprobar el bloqueo, documentar su resolución y completar el mantenimiento relacionado. |  |  |
| Consultar un reporte y la bitácora, descargar el CSV y restaurar los datos de demostración. |  |  |
| Completar los recorridos con teclado; revisar con lector de pantalla nombres de controles, errores de formulario, cambios de estado y confirmaciones. |  |  |

**Resultado general:** Aceptado / Aceptado con pendientes / Requiere ajustes

**Pendientes priorizados:**

1. __________________________________________________________________________________
2. __________________________________________________________________________________

**Aprobación del revisor:** ______________________________

## Límites conocidos

Esta entrega es un prototipo de frontend con datos locales por navegador. Autenticación, permisos reales, API Gateway, microservicios, RabbitMQ, bases de datos de servicio, concurrencia multiusuario, respaldos, despliegue productivo y auditoría de seguridad requieren implementación aparte. Las fechas iniciales y algunos registros representan datos semilla; se distinguen en la interfaz como datos de demostración.
