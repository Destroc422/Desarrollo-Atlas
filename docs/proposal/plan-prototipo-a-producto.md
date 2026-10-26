# Plan para pasar Atlas de prototipo a producto funcional

**Objetivo:** convertir la interfaz de demostración actual en un producto web operativo, con usuarios reales, permisos, persistencia de servidor y flujos de negocio trazables. La arquitectura de destino es la descrita en `docs/architecture/` y `docs/adr/`.

## Punto de partida

- Existe una interfaz React, TypeScript y Vite con recorridos de inventario, compras, organización, asignaciones, inspecciones, mantenimiento, reportes y auditoría.
- El estado de negocio de esa interfaz se guarda en `localStorage`; no hay API de negocio ni autenticación real.
- Hay decisiones documentadas para límites de servicio, propiedad de datos, Gateway, RabbitMQ, PostgreSQL y consistencia distribuida.
- Existe una configuración inicial de Docker Compose para PostgreSQL, RabbitMQ y Traefik. La documentación indica que aún no se ha validado ejecutándola en este equipo.
- No se deben cargar los datos del prototipo directamente como inventario oficial. Si existen datos que conservar, se importan desde una plantilla validada y con conciliación.

## Decisión de alcance

Entregar primero un **piloto funcional de un solo cliente/organización**, con un recorrido vertical de compra, recepción, inventario y custodia. Después se amplía a inspecciones, mantenimiento y analítica. Cada servicio conserva su propiedad lógica de datos desde el inicio, aunque varios usen el mismo clúster PostgreSQL.

La estimación previa de **273 horas / 6,5 semanas** alcanza para un piloto priorizado, sujeto a confirmar alcance e integraciones. No se debe presentar como plazo para construir, asegurar y operar los once servicios completos en producción. Al finalizar el descubrimiento se estima por separado la plataforma completa, incluyendo nube, soporte, migración, SSO/ERP y requisitos de disponibilidad.

## Fases de ejecución

| Fase | Trabajo | Entregable y puerta de salida |
|---|---|---|
| 0. Descubrimiento y definición del piloto | Confirmar organización/sede piloto, roles, volumen esperado, procesos reales, política de seriales, catálogos, aprobaciones, retención de evidencias, SSO/ERP, nube, RPO/RTO y criterios de éxito. Separar datos semilla de datos que se importarán. | Alcance firmado internamente, mapa de permisos, escenarios y criterios cuantificables; backlog priorizado y estimación revisada. No iniciar 11 servicios en paralelo. |
| 1. Base ejecutable y entrega continua | Validar Compose; crear estructura `services/`, `contracts/` e infraestructura; CI para frontend y servicios; configuración por entorno, secretos fuera del repositorio, health/readiness, logs estructurados, correlación y migraciones. Mantener una base y un usuario por servicio, redes privadas y sin credenciales administrativas en runtimes. | Entorno reproducible desde cero; `docker compose config` y arranque comprobados en CI; migraciones repetibles; gateway y dependencias con health checks. |
| 2. Identidad, Gateway y Catálogo | Implementar inicio/cierre de sesión, expiración, roles y permisos; decidir IdP/SSO del cliente o mecanismo local del piloto. Conectar React con `/api/v1`; construir Catálogo con validación de código, categoría, unidad y control por cantidad/serial. | Usuario autenticado; el backend vuelve a autorizar cada operación; CRUD de catálogo persiste en su base; el frontend deja de usar `localStorage` como fuente de negocio para este flujo. |
| 3. Compras e Inventario: primer flujo vertical | Implementar órdenes, aprobación y recepción aceptada; en Inventario crear saldos, activos serializados y movimientos. Añadir transacción local + outbox, consumidores idempotentes, claves de idempotencia, serial único, rechazo de exceso y recuperación de mensajes. | Desde la UI se crea y recibe una orden; la recepción parcial/final actualiza Inventario una sola vez; duplicados, concurrencia y fallos parciales no duplican existencias ni movimientos. |
| 4. Organización y Asignaciones | Administrar colaboradores, grupos y ubicaciones; implementar reserva atómica, entrega, devolución y traslado como proceso con estado; verificar permisos y elegibilidad en el servicio propietario. | Un activo no puede asignarse dos veces concurrentemente; devolución deja historial y devuelve disponibilidad solo cuando Inventario confirma. |
| 5. Inspecciones y Mantenimiento | Plantillas, agenda, evidencia de inspección, incidencias críticas, órdenes de trabajo, costos y transición de estado. Guardar archivos en almacenamiento de objetos con permisos y metadatos, no en la base como blobs grandes. | Una incidencia restringe el activo; el desbloqueo requiere resolución autorizada; mantenimiento no libera un activo con restricciones abiertas. |
| 6. Eventos, Notificaciones, Auditoría y Reportes | Versionar eventos; configurar exchanges, colas, reintentos y DLQ; guardar auditoría append-only con redacción de datos; construir proyecciones reconstruibles y reportar su fecha de actualización. | Eventos duplicados no duplican efectos; una falla de notificaciones no revierte operaciones; reportes declaran su frescura y son reconciliables con sus fuentes. |
| 7. Seguridad, migración y piloto controlado | Threat model, revisión de permisos, validación de entradas, límites de tasa, TLS, rotación de secretos, copias y simulacro de restauración, monitoreo, alertas y runbooks. Importar datos solo tras deduplicación y conciliación con el responsable del inventario. Desplegar a una sede piloto, atender incidencias y cerrar brechas. | Puerta de salida de piloto aprobada con evidencias: restauración, permisos por rol, recorridos end-to-end, conciliación de datos y plan de reversa. Expandir organizaciones/sedes después de estabilizar. |

## Orden recomendado para construir

1. Hacer funcionar un solo recorrido de extremo a extremo (Catálogo → Compra → Recepción → Inventario → Movimiento → Reporte) antes de aumentar la cantidad de servicios.
2. Añadir Identidad y autorización en el borde y dentro del servicio antes de exponer datos reales.
3. Completar Organización y Asignaciones con reserva concurrente y trazabilidad.
4. Añadir Inspecciones y Mantenimiento con estados y archivos.
5. Añadir proyecciones, notificaciones, auditoría operativa y exportaciones.
6. Endurecer y desplegar a piloto; escalar infraestructura solo con métricas y requisitos reales.

No crear contenedores vacíos para aparentar que ya existen todos los microservicios. Cada servicio entra al despliegue cuando tiene un caso de uso vertical funcionando, persistencia propia, contratos, observabilidad y una puerta de CI.

## Cortes de alcance

### Piloto en torno a 273 horas

Foco: una organización, un ambiente de piloto, roles esenciales, Catálogo, Compras/Recepción, Inventario y una primera versión de Asignaciones; incluir solo las partes de inspección, mantenimiento y reportes necesarias para validar la operación acordada. Una persona con apoyo de Codex puede reducir trabajo mecánico, pero sigue siendo responsable de diseño, revisión y operación. Se requiere que el cliente aporte decisiones, datos ficticios/limpios y revisión de negocio a tiempo.

### Plataforma funcional completa

Después del piloto, estimar y ejecutar por fases todos los contextos, alta disponibilidad acorde a RPO/RTO, SSO/ERP si aplican, varias organizaciones, retención de evidencias, soporte, observabilidad y despliegue productivo. No fijar costo/plazo contractual antes de resolver los puntos abiertos de la fase 0 y validar el piloto.

## Requisitos transversales de terminado

- Ninguna interfaz de producción lee o escribe la base de otro servicio; no hay transacciones distribuidas ni claves foráneas cruzadas.
- Todo cambio de negocio sensible valida actor, permiso, invariante y estado actual en el servicio propietario.
- Operaciones críticas usan idempotencia; los eventos salen por outbox y se consumen con inbox/deduplicación.
- Contratos HTTP/eventos versionados y ejemplos; compatibilidad verificada antes de desplegar productores/consumidores.
- Las bases se crean y migran automáticamente en un entorno limpio; cada servicio tiene backup y procedimiento de restauración probado.
- CI verifica estilo/tipos, reglas de dominio, adaptadores, permisos, contratos, migraciones, imágenes y flujos end-to-end ya implementados.
- Hay trazas/correlación, logs sin secretos, métricas de salud y profundidad de colas; las DLQ tienen responsable y procedimiento de reproceso.
- Se monitorean errores, latencia, disponibilidad y frescura de reportes con umbrales acordados; alertas tienen runbook.
- El frontend muestra errores recuperables, estados pendientes, permisos insuficientes y desconexión sin fingir éxito ni perder datos del formulario.
- Existe un plan de despliegue, rollback, soporte, backup/restore y manejo de incidentes antes de declarar producción.

## Riesgos y decisiones que pueden mover el plan

- **SSO y ciclo de vida de usuarios:** usar un proveedor de identidad externo o construir gestión de credenciales propia cambia seguridad, alcance y mantenimiento. Preferir OIDC si la organización ya tiene IdP.
- **Concurrencia:** recepciones y reservas simultáneas requieren restricciones transaccionales e idempotencia, no solo validación de pantalla.
- **Migración:** los datos de demostración no son fuente fiable; acordar una plantilla, dueños de datos, conciliación y corte.
- **Disponibilidad:** no elegir Kubernetes ni alta disponibilidad por anticipado; decidirlos desde el SLO, capacidad del equipo y entorno contratado.
- **Archivos y datos personales:** definir permisos, cifrado, retención y borrado para actas y evidencias antes de almacenar archivos reales.
- **Operación de eventos:** definir quién atiende DLQ, reprocesos y eventos retrasados; RabbitMQ por sí solo no resuelve consistencia.
- **Alcance de producto:** multiempresa, aplicación móvil, códigos de barras, aprobaciones complejas e integración contable deben ser decisiones explícitas, no asumirlas dentro del MVP.

## Qué significa “funcional” en el piloto

Se considera listo para piloto cuando los usuarios autorizados operan contra APIs y bases persistentes, los flujos priorizados sobreviven recargas y fallos/reintentos, se puede recuperar el servicio desde una copia, los reportes indican su frescura, la operación puede rastrearse por correlación y una persona responsable acepta el resultado con datos de prueba. La interfaz sola, Compose en estado iniciado o un build exitoso no satisfacen esta definición.

## Relación con documentación existente

- Contextos e invariantes: `docs/architecture/bounded-contexts.md`
- Propiedad de datos: `docs/architecture/data-ownership.md`
- APIs: `docs/architecture/api-and-data-model.md`
- Eventos: `docs/architecture/events-and-integration.md`
- Pruebas y puertas de CI: `docs/architecture/testing-strategy.md`
- Infraestructura local: `docs/deployment/local-development.md`
- Estimación del piloto: `docs/proposal/estimacion-referencial.md`
