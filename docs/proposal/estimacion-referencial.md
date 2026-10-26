# Propuesta referencial de implementación de Atlas

**Fecha:** 26 de octubre de 2026 · **Moneda:** pesos colombianos (COP) · **Tipo:** estimación para planeación, no oferta contractual

## Resumen ejecutivo

Para entregar una primera versión productiva que cubra los contextos funcionales definidos para Atlas, la referencia es **6 a 8 meses calendario**, con un equipo de aproximadamente **5 a 6 personas** y **2.200 a 2.800 horas-persona**. El presupuesto de referencia es **COP 305 a 485 millones antes de impuestos**, con un punto de planeación cercano a **COP 405 millones**.

La cifra presupone decisiones de alcance durante una fase inicial de descubrimiento y un despliegue web en una nube elegida por el cliente. Nube, licencias de terceros, hardware, integraciones no identificadas y operación posterior se cotizan aparte. “100% funcional” significa que todos los escenarios de aceptación acordados para esta primera versión pasan en el ambiente de producción; no significa que un producto esté libre de errores o de cambios futuros.

## Alcance considerado

- Identidad, inicio de sesión, usuarios, roles y permisos.
- Catálogo, productos y reglas de seguimiento por unidad o cantidad.
- Compras, aprobaciones, recepción parcial y completa, y alta de fichas para productos nuevos al recibir.
- Inventario, existencias, activos serializados, ubicaciones, ajustes y traslados.
- Organización, sedes, grupos y responsables.
- Asignaciones, actas de entrega, devoluciones y trazabilidad de custodia.
- Inspecciones, evidencias, incidencias y agenda.
- Mantenimiento, órdenes de trabajo, costos y disponibilidad de activos.
- Notificaciones, reportes y auditoría.
- API Gateway, correlación de solicitudes, controles de seguridad, bases de datos con propiedad por servicio y eventos versionados en RabbitMQ.
- Interfaz React/TypeScript, APIs, pruebas, CI/CD, observabilidad básica, documentación técnica, despliegue y transferencia al equipo del cliente.

Se supone un primer despliegue para una organización, una carga inicial por plantillas CSV acordadas y servicios que puedan compartir un clúster administrado, manteniendo bases, credenciales y propiedad lógica separadas. No se supone una instalación on-premise ni una integración con ERP, directorio corporativo, contabilidad, RFID o proveedores externos hasta confirmar sus interfaces.

## Fases y plazo

| Fase | Duración de referencia | Resultado |
|---|---:|---|
| Descubrimiento y cierre de alcance | 2–3 semanas | Reglas, flujos, integraciones, criterios de aceptación y plan de datos aprobados |
| Fundaciones de plataforma | 4–6 semanas | Identidad, gateway, bases, mensajería, despliegue inicial y estructura del frontend |
| Catálogo, compras e inventario | 6–8 semanas | Operación de productos, órdenes, recepción, activos y movimientos |
| Organización, asignaciones e inspecciones | 5–7 semanas | Custodia, sedes, agenda, evidencias e incidencias |
| Mantenimiento, reportes, notificaciones y auditoría | 4–6 semanas | Seguimiento operativo, alertas, consultas y trazabilidad |
| Pruebas de aceptación, datos y salida a producción | 3–5 semanas | Correcciones, carga inicial, formación y puesta en operación |

Las fases se solapan parcialmente con trabajo paralelo. La duración total estimada es de **24 a 32 semanas**. La aprobación tardía de reglas, acceso a sistemas externos, calidad de los datos o revisiones del cliente puede ampliar el calendario.

## Equipo de referencia

- Líder técnico / arquitecto: 0,5–1 dedicación.
- Dos o tres desarrolladores backend.
- Un desarrollador frontend.
- QA / automatización: 0,5–1 dedicación.
- DevOps / seguridad: parcial, con refuerzo en despliegues.
- Analista funcional / producto: parcial.

La composición exacta puede variar; la estimación usa horas-persona y no exige que cada perfil sea de tiempo completo durante toda la ejecución.

## Modelo de costo

| Escenario | Horas-persona | Tarifa combinada de planeación | Subtotal con reserva de 15% |
|---|---:|---:|---:|
| Bajo | 2.200 | COP 120.000/h | COP 304.800.000 |
| Central | 2.500 | COP 140.000/h | COP 402.500.000 |
| Alto | 2.800 | COP 150.000/h | COP 483.000.000 |

Por simplicidad, la recomendación presupuestal se redondea a **COP 305–485 millones antes de impuestos**, con **COP 405 millones** como cifra central para planear. La tarifa combinada es un supuesto de modelación para un proveedor que integra perfiles, coordinación y entrega; no es una tarifa salarial publicada ni una cotización de proveedor. La reserva cubre incertidumbre moderada de requisitos y estabilización. No cubre ampliaciones de alcance ni integraciones que aún no hayan sido identificadas.

Las referencias públicas disponibles sirven como contexto para los costos del talento: Multiplier publica rangos orientativos de salario bruto mensual para desarrolladores junior, mid y senior en Colombia durante 2026, y estima que la carga del empleador depende del caso; Cenisoft/FEDESOFT publica su encuesta del sector TI para 2025; la guía 2026 de Michael Page refleja demanda por perfiles tecnológicos, aunque las tablas salariales requieren desbloqueo. Esas referencias **no** determinan por sí solas el precio del proyecto: la cifra de Atlas se calcula por esfuerzo, composición del equipo, coordinación, calidad y contingencia.

## Fuera del presupuesto

- Consumo de nube, dominios, certificados, correo/SMS/WhatsApp y licencias de terceros.
- Compra e instalación de lectores, impresoras, etiquetas, RFID u otros dispositivos.
- Integraciones con ERP, SSO/directorios, contabilidad, compras externas o proveedores, hasta definir sistemas, protocolos y ambientes de prueba.
- Limpieza extensa de datos, digitación o migración desde fuentes no estructuradas.
- Aplicaciones móviles nativas y funcionamiento offline.
- Soporte evolutivo después de la garantía correctiva acordada.

## Siguiente paso para cerrar una oferta

Realizar un descubrimiento de **2 a 3 semanas** para confirmar usuarios y sedes, volumen de datos, reglas de aprobación, formatos de migración, integraciones, seguridad requerida, infraestructura y responsables de aceptación. Al cerrar esa etapa se puede transformar el rango en un backlog priorizado, calendario por entregas y precio contractual con supuestos y criterios verificables.

## Fuentes de contexto salarial

- [Multiplier — Hiring in Colombia 2026: Salary & Employer Costs Guide](https://www.usemultiplier.com/columbia/cost-of-employment). Publica rangos orientativos por seniority y supuestos de cargas del empleador; el propio artículo advierte que los benchmarks agregados son un punto de partida.
- [Cenisoft/FEDESOFT — Encuesta de salarios y profesionales del sector de software y TI en Colombia 2025](https://cenisoft.org/encuesta-de-salarios-2025-infografia/).
- [Michael Page Colombia — Guía salarial de tecnología 2026](https://www.michaelpage.com.co/guia-salarial/tecnolog%C3%ADa). Presenta perfiles y demanda; la vista consultada requiere desbloquear las tablas para ver valores.
