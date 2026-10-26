# Plataforma empresarial de inventario

Repositorio para el sistema empresarial de inventario, activos, compras, asignaciones, inspecciones y mantenimiento.

## Estado

La arquitectura está documentada y existe una base Docker Compose para Gateway, PostgreSQL y RabbitMQ. El prototipo web incluye vistas y flujos locales para resumen, inventario, catálogo, movimientos, compras y recepción, organización, asignaciones, inspecciones, mantenimiento, reportes, auditoría, notificaciones y configuración.

El prototipo guarda datos de demostración en el navegador (`localStorage`). Permite recorrer las operaciones y observar sus cambios relacionados, pero todavía no se conecta con APIs ni están implementados los microservicios de negocio. No debe usarse como sistema productivo ni como respaldo oficial de inventario.

## Arquitectura

- Frontend: React, TypeScript y Vite.
- Entrada HTTP: API Gateway; las reglas de dominio permanecen en los servicios.
- Backend: microservicios autónomos, cada uno con DDD y puertos y adaptadores.
- Persistencia: una base lógica y credenciales propias por servicio; en desarrollo pueden residir en un mismo clúster PostgreSQL.
- Eventos: RabbitMQ, contratos versionados, consumidores idempotentes y outbox transaccional.
- Lecturas que combinan dominios: proyecciones del servicio de reportes, alimentadas por eventos.

## Documentación

- [Arquitectura y topología](docs/architecture/overview.md)
- [Contextos, agregados e invariantes](docs/architecture/bounded-contexts.md)
- [Propiedad y acceso a datos](docs/architecture/data-ownership.md)
- [APIs y modelo de datos inicial](docs/architecture/api-and-data-model.md)
- [Contratos de eventos e integración](docs/architecture/events-and-integration.md)
- [Estrategia de pruebas](docs/architecture/testing-strategy.md)
- [Decisiones arquitectónicas](docs/adr/README.md)
- [Fases de implementación](docs/architecture/roadmap.md)
- [Entorno local](docs/deployment/local-development.md)

## Inicio

Para ver el prototipo, desde `frontend/` ejecuta `npm install` y `npm run dev`; Vite lo sirve en `http://localhost:5173`. Los cambios de demostración (incluidas las recepciones, altas y transiciones de estado) se guardan en el navegador y se reinician al limpiar los datos del sitio.

## Propuesta referencial

La estimación de esfuerzo, plazo, alcance y costo para llevar los contextos documentados a una primera versión productiva está en [Propuesta de implementación](docs/proposal/estimacion-referencial.md). Es una referencia para planeación; requiere confirmar integraciones, migración de datos, infraestructura y criterios de aceptación antes de convertirse en oferta contractual.

La infraestructura requiere Docker Engine y Docker Compose v2. Copia `.env.example` a `.env` y ejecuta `docker compose up -d`. La inicialización crea una base y rol por contexto en el clúster PostgreSQL local. La Gateway todavía no enruta a servicios de negocio.
