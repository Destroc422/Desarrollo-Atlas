# Registro de decisiones arquitectónicas

Las decisiones aprobadas para la fase de diseño están documentadas en:

- [ADR-0001: límites de servicio y monorepo](0001-service-boundaries.md)
- [ADR-0002: bases aisladas y despliegue físico compartido](0002-database-ownership.md)
- [ADR-0003: eventos RabbitMQ, outbox e idempotencia](0003-messaging.md)
- [ADR-0004: Gateway y seguridad de servicio](0004-api-entry-and-security.md)

Una ADR se reemplaza con otra ADR; no se reescribe para ocultar decisiones previas. Estado `Aceptada` significa decisión de diseño para iniciar implementación, sujeta a validar operación y requisitos reales.
