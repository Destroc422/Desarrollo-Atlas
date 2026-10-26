# Estrategia de pruebas y aceptación

Las pruebas se agregan junto con cada comportamiento funcional. Una fase no se declara lista solo porque sus contenedores inician.

## Pirámide

| Nivel | Qué demuestra | Herramientas previstas |
|---|---|---|
| Dominio unitario | Invariantes de agregados, estados permitidos, reglas de cálculo y value objects sin I/O | Pytest; Vitest para frontend |
| Aplicación | Casos de uso y compensaciones mediante puertos dobles/fakes; permisos requeridos | Pytest, React Testing Library |
| Adaptador | Serialización HTTP/eventos, repositorio, transacciones y consultas propias | TestClient/httpx; PostgreSQL/RabbitMQ efímeros cuando aplique |
| Contrato | Compatibilidad OpenAPI/JSON Schema productor-consumidor, versiones y ejemplos | OpenAPI/JSON Schema y pruebas de contrato |
| Integración | Enrutamiento real, persistencia separada, colas, outbox/inbox, migraciones y health checks | Docker Compose en CI |
| E2E | Flujos críticos UI → Gateway → servicio → persistencia/evento → proyección | Playwright |
| Arquitectura/seguridad | Sin importaciones de infraestructura en dominio, sin acceso DB cruzado, permisos obligatorios, secretos ausentes | Reglas automatizadas, escaneo de dependencias/configuración |

## Casos obligatorios por flujo

- Compra/recepción: aprobación no aumenta stock; cantidades aceptadas únicamente; parcialidad; serial duplicado rechazado; mismo evento/Idempotency-Key dos veces produce un solo movimiento; outbox retrasado se publica al reintentar.
- Asignación: unidad reservada impide segunda asignación; solicitudes concurrentes solo permiten una reserva; grupo/colaborador inactivo rechaza; fallo entre reserva y confirmación libera o reanuda saga; devolver produce historial nuevo sin borrar entrega.
- Inspección: generación del periodo repetida no duplica; evidencia obligatoria; incidencia crítica persiste aunque falte conexión; no se reserva activo con restricción abierta o no verificable; solo resolución autorizada permite solicitar liberación.
- Mantenimiento: trabajo y costos completos; activo no se libera antes de confirmar en Inventario; evento duplicado no duplica la transición.
- Mensajería: ack solo después de commit local; mensaje malformado o que agota reintentos llega a DLQ; reproceso usa el mismo `event_id`; notification provider fuera de servicio no revierte el caso de origen.
- Autorización/auditoría: rol insuficiente recibe 403 también en API interna; auditoría incluye actor/correlación y redacciona tokens, contraseñas y PII; usuario no puede consultar reportes ajenos al alcance.

## Puertas de CI por servicio

1. Formato y análisis estático (Ruff, mypy; ESLint/TypeScript en frontend).
2. Pruebas unitarias de dominio y aplicación.
3. Pruebas de adaptadores e integración del servicio con solo sus dependencias.
4. Migración desde una base vacía y validación de rollback/forward según política.
5. Construcción de imagen sin secretos y comprobación de health check.
6. Contratos de eventos/OpenAPI y compatibilidad hacia atrás.
7. Compose integrado y Playwright para los flujos que ya estén implementados.

No hay una suite de código ejecutable en la etapa de diseño. Docker no está disponible en el entorno actual; cuando se implemente Compose, la puerta de integración debe correrse en un runner CI con Docker antes de aceptar el entorno.
