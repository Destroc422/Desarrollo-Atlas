# Propiedad y aislamiento de datos

## Regla

Un servicio es propietario exclusivo de las tablas, migraciones y transacciones de su contexto. Ni el gateway, frontend, tareas operativas ni otros servicios reciben credenciales de esa base. Se prohíben joins, claves foráneas y escrituras cruzadas entre bases. Compartir un host PostgreSQL o RabbitMQ reduce costo de infraestructura, pero no transfiere la propiedad.

## Aislamiento inicial

| Servicio | Base lógica sugerida | Rol runtime |
|---|---|---|
| identity | `identity_db` | `identity_app` |
| catalog | `catalog_db` | `catalog_app` |
| procurement | `procurement_db` | `procurement_app` |
| inventory | `inventory_db` | `inventory_app` |
| organization | `organization_db` | `organization_app` |
| assignment | `assignment_db` | `assignment_app` |
| inspection | `inspection_db` | `inspection_app` |
| maintenance | `maintenance_db` | `maintenance_app` |
| notification | `notification_db` | `notification_app` |
| reporting | `reporting_db` | `reporting_app` |
| audit | `audit_db` | `audit_app` |

Cada rol runtime tiene permisos únicamente en su base. La creación de bases y roles se hace por bootstrap administrativo local/de despliegue; no se expone el rol superusuario a los contenedores. Cada servicio aplica sus migraciones con un job/proceso controlado previo a escalar réplicas. Sus migraciones no pueden cambiar otra base.

## Contratos para compartir información

- Consultas inmediatas: API versionada del servicio dueño, con autenticación, autorización, timeout y respuesta mínima necesaria.
- Consultas de lectura de alto volumen o múltiples dominios: proyección local de Reportes mediante eventos, identificando consistencia y `updated_at`.
- Reacción a cambios confirmados: evento versionado publicado desde outbox.
- Nunca: SQL hacia otra base, filesystem compartido como canal de datos, replicación de tablas sin contrato o dependencia de ORM/entidades de otro dominio.

Las proyecciones de consumidores son copias derivadas, no autoridad. Se pueden reconstruir y no actualizan la fuente. Los IDs de entidades externas se guardan como referencias opacas; los snapshots son pequeños, fechados y solo para lectura/auditoría.

## Evolución operacional

La separación lógica desde el día uno permite separar un servicio a un clúster dedicado, cambiar su motor/adaptador o escalarlo por su cuenta. Deben rotarse por separado sus credenciales, respaldar y restaurar cada base, medir su uso y probar el bootstrap desde cero. Las diferencias de retención y protección de PII se documentan por dominio.
