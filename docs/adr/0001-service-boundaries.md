# ADR-0001: límites de servicio y monorepo

- Estado: Aceptada para iniciar
- Fecha: 2026-10-25

## Contexto

El sistema abarca capacidades con ritmos, reglas e historiales propios. Un CRUD separado por tabla generaría acoplamiento accidental; un backend monolítico no cumpliría la autonomía pedida.

## Decisión

Usar un monorepo con servicios independientes por capacidad: identidad, catálogo, compras, inventario, organización, asignaciones, inspecciones, mantenimiento, notificaciones, auditoría y reportes. Cada servicio tendrá imagen, configuración, API/consumidores, pruebas, migraciones y modelo de dominio propios. El frontend TypeScript y la API Gateway son aplicaciones separadas. Los contratos versionados son el único vocabulario de integración estable.

## Consecuencias

Se obtienen límites claros y cambios coordinados de contratos en un solo repositorio. Aumentan el número de builds, bases, probes y tareas operativas. La CI debe filtrar por servicio y validar dependencias; el monorepo no autoriza importar modelos internos de otros servicios.
