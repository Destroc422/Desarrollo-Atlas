# ADR-0002: bases aisladas y despliegue físico compartido

- Estado: Aceptada para iniciar
- Fecha: 2026-10-25

## Contexto

Se pide persistencia por servicio y se permite compartir infraestructura física al inicio. Un esquema único con credenciales comunes no protege los límites de propiedad.

## Decisión

Una base lógica y rol runtime exclusivo por servicio desde el primer entorno. El Compose de desarrollo puede alojarlas en un único clúster PostgreSQL; ningún runtime obtiene permisos de otra base ni el rol administrador. Migraciones y respaldos se administran por servicio. La separación física es una evolución operacional sin cambio de propiedad ni contrato.

## Consecuencias

Reduce costo inicial y permite administración local sencilla, conservando barreras técnicas y camino de separación. El clúster es punto compartido de fallo en desarrollo; disponibilidad y recuperación por base deben probarse antes de producción. Bootstrap de bases/roles debe ser automatizado y reproducible.
