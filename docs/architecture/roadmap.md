# Hoja de ruta de implementación

Las entregas se validan con comportamiento ejecutable antes de ampliar el alcance. Los servicios no se añaden como contenedores vacíos para simular cobertura.

## Fase 1 — diseño arquitectónico (documentado)

- Contextos, propiedad de datos, invariantes, topología, integración y ADR.
- Entregable actual: documentos de `docs/architecture/` y `docs/adr/`.

## Fase 2 — infraestructura base (configuración inicial entregada; verificación pendiente)

- Gateway, PostgreSQL compartido físicamente con bases/roles aislados, RabbitMQ, redes, configuración local de secretos y probes.
- `compose.yaml` contiene la infraestructura; no se declara ejecutable hasta validar `docker compose config` y arranque en un host con Docker.
- Aún faltan configuración de topology RabbitMQ, migraciones y servicios de aplicación. Se añaden al completar cada dominio.
- Correlación/logs estructurados y health/readiness inicial.

## Fase 3 — identidad y catálogo (prototipo de interfaz entregado)

- Entregado en `frontend/`: prototipo React/TypeScript/Vite con navegación para inventario, catálogo, compras, asignaciones, inspecciones, mantenimiento y reportes; búsqueda y filtros locales; formularios de producto/ingreso y detalle de activo.
- La interfaz aún usa datos de demostración en `localStorage`; no representa una persistencia ni autorización de backend.
- Pendiente: `identity-service` y `catalog-service` funcionales con persistencia/migraciones separadas, autenticación/autorización backend, Gateway conectada, contratos OpenAPI y pruebas de unidad/API/integración.

## Fase 4 — compras e inventario

- Proveedores, órdenes multi-línea, aprobación, recepción aceptada, movimientos, cantidades/unidades serializadas, outbox/inbox e idempotencia.
- Flujo de recepción parcial desde UI hasta reporte inicial.

## Fase 5 — organización y asignaciones

- Grupos/colaboradores, historial, reserva atómica, entrega, devolución y transferencias coordinadas.

## Fase 6 — inspecciones y mantenimiento

- Plantillas, calendario idempotente, evidencias, incidencias, bloqueo/liberación segura y órdenes de trabajo.

## Fase 7 — notificaciones, auditoría y reportes

- Entrega asíncrona con reintentos, auditoría separada, proyecciones reconstruibles y marca de frescura.

## Fase 8 — endurecimiento y operación

- Pruebas de contrato, concurrencia y fallos, seguridad, backups/restauración, CI, guías operativas y despliegue destino.
- Kubernetes es posterior: se agrega cuando la operación concreta lo requiera y se validan probes, secretos, persistencia, red y recuperación.

Cada fase incorpora pruebas acordes a los flujos implementados y actualiza esta documentación. No se declara lista para producción por tener Compose o manifiestos solamente.
