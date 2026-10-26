# Integración y contratos de eventos

## Envoltura de evento

Todos los eventos publicados llevan una envoltura equivalente a:

```json
{
  "event_id": "uuid",
  "event_type": "inventory.receipt-accepted.v1",
  "schema_version": 1,
  "occurred_at": "2026-10-25T12:00:00Z",
  "producer": "procurement-service",
  "correlation_id": "uuid",
  "causation_id": "uuid-or-null",
  "aggregate": { "type": "purchase_receipt", "id": "uuid", "version": 3 },
  "data": {}
}
```

Los contratos residen en `contracts/events/<context>/<event>.vN.json` una vez se materialice la implementación. Los campos son compatibles hacia atrás dentro de una versión; cambios incompatibles crean nueva versión. No se incluyen tokens, contraseñas, adjuntos, PII no requerida ni valores secretos.

## Catálogo inicial

| Evento | Productor | Consumidores iniciales | Efecto esperado |
|---|---|---|---|
| `catalog.product-created.v1` / `catalog.product-updated.v1` | Catálogo | Compras, Inventario, Reportes | Proyección mínima del producto por ID y versión |
| `procurement.purchase-order-approved.v1` | Compras | Reportes, Auditoría, Notificaciones | Actualizar seguimiento/alerta; no crea existencia |
| `procurement.receipt-accepted.v1` | Compras | Inventario, Reportes, Auditoría | Inventario registra solo cantidad aceptada con clave idempotente |
| `inventory.received.v1`, `inventory.adjusted.v1`, `inventory.transferred.v1` | Inventario | Asignaciones, Reportes, Auditoría, Notificaciones | Actualizar proyecciones; preservar movimiento de origen |
| `inventory.asset-reserved.v1`, `inventory.asset-reservation-released.v1` | Inventario | Asignaciones, Reportes, Auditoría | Avanzar o compensar saga de asignación |
| `assignment.asset-assigned.v1`, `assignment.asset-returned.v1` | Asignaciones | Inventario si requiere transición, Reportes, Auditoría, Notificaciones | Actualizar custodia/proyección con referencia fuente |
| `inspection.completed.v1`, `inspection.critical-incident-opened.v1`, `inspection.incident-resolved.v1` | Inspecciones | Inventario, Mantenimiento, Reportes, Auditoría, Notificaciones | Abrir seguimiento y restricciones; efecto físico requiere confirmación de Inventario |
| `maintenance.work-order-opened.v1`, `maintenance.work-order-completed.v1` | Mantenimiento | Inventario, Reportes, Auditoría, Notificaciones | Actualizar proyecciones; transición física autorizada en Inventario |
| `notification.requested.v1`, `notification.delivered.v1`, `notification.failed.v1` | Consumidores de negocio / Notificaciones | Notificaciones, Reportes, Auditoría según caso | Envío/reintento y seguimiento |
| `audit.business-action-recorded.v1` | Cada servicio fuente | Auditoría | Ingesta append-only, idempotente, filtrada |

Este catálogo fija nombres y responsabilidades, no pretende definir aún todos los payloads de negocio. Cada payload queda especificado y validado contra JSON Schema cuando se implemente el productor y consumidor correspondiente.

## RabbitMQ

Usar exchanges durables de tipo topic, colas durables por servicio y claves de enrutamiento versionadas. Cada cola posee DLX/DLQ; límites de reintentos y demoras evitan bucles. Publicación con confirmación, mensajes persistentes y consumidor con ack manual. La bandeja de entrada almacena `event_id` y resultado dentro de la misma transacción que el efecto del consumidor. Los eventos expirados o incompatibles requieren inspección operativa; el reproceso conserva la clave original.

El outbox se inserta en la misma transacción que los cambios del agregado. Un publicador separado transmite y marca publicación; si se cae después de publicar, puede repetir, por lo que los consumidores siguen siendo idempotentes. No se afirma entrega exactamente una vez.

## HTTP interno

HTTP es adecuado para validar colaborador, consultar permiso/recurso o reservar un activo. Contratos OpenAPI separados por servicio. Cada llamada incluye credenciales, `traceparent` y correlación; timeout acotado, errores tipados y reintentos solo para métodos idempotentes o con clave idempotente. Evitar cadenas largas. Si una llamada crítica falla, no fingir éxito ni aceptar una decisión de disponibilidad obsoleta.

Las APIs externas pasan por Gateway. Servicios no reenvían arbitrariamente cabeceras de identidad del usuario y validan audiencias/scopes. Para comunicación servicio-a-servicio, se usa identidad de servicio y autorización específica.
