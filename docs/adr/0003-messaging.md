# ADR-0003: RabbitMQ, outbox e idempotencia

- Estado: Aceptada para iniciar
- Fecha: 2026-10-25

## Contexto

Compras, inventario, asignaciones, inspecciones, auditoría y reportes reaccionan a hechos de otros dominios sin compartir transacciones ni tablas. La entrega duplicada y los fallos después de confirmar el dato son posibles.

## Decisión

RabbitMQ con exchanges/colas durables y DLQ para integración asíncrona. Cada servicio que publica eventos transaccionales usa outbox local; los consumidores usan inbox/idempotencia por `event_id` y efectúan deduplicación junto al cambio local. Eventos versionados y trazables. No se busca semántica exactamente-una-vez ni transacción distribuida.

## Consecuencias

Se desacopla disponibilidad de servicios y se puede reconstruir proyecciones. Aumenta complejidad de operación, latencia eventual y necesidad de gestionar colas fallidas, compatibilidad de contratos y reproceso seguro.
