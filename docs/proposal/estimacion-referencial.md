# Presupuesto revisado: piloto de Atlas con una persona y Codex

**Fecha:** 26 de octubre de 2026 · **Moneda:** COP, con Codex facturado en USD · **Tipo:** presupuesto aritmético para planeación

## Escenario solicitado

- Una persona durante **1,5 meses (aproximadamente 6,5 semanas)**.
- Jornada máxima de referencia: **42 horas semanales**, equivalente a **210 horas mensuales** para calcular el valor de la hora ordinaria desde el 15 de julio de 2026.
- Acceso a **dos modelos de Codex bajo una sola cuenta individual**. Los modelos no requieren dos suscripciones; el plan da acceso a Codex y define sus límites de uso.
- Salario mínimo mensual colombiano 2026: **COP 1.750.905**.

El presupuesto calcula el tiempo de trabajo a salario mínimo, como pediste. Esto es una base matemática y **no una tarifa de mercado para contratar un desarrollador de software**.

## Cálculo

| Concepto | Cálculo | Valor de referencia |
|---|---:|---:|
| Horas mensuales | 42 h/semana × 30 ÷ 6 | 210 h |
| Hora ordinaria de referencia para nómina | COP 1.750.905 ÷ 210 h | **COP 8.337,64/h** |
| Horas efectivas aproximadas del plazo | 42 h/semana × 52/12 × 1,5 meses | **273 h** |
| Remuneración base | COP 1.750.905 × 1,5 meses | **COP 2.626.358** |
| Codex Pro para uso intensivo | USD 100/mes × 2 ciclos mensuales | USD 200 ≈ **COP 631.686** |
| **Presupuesto directo estimado** | Remuneración + dos ciclos de Codex | **COP 3.258.044** |

El divisor de **210 horas** es la referencia de nómina para calcular la hora ordinaria con la jornada máxima de 42 horas semanales. No representa las horas efectivas de trabajo de cada mes. Para este presupuesto, el salario se calcula como 1,5 salarios mínimos y corresponde a unas 273 horas efectivas; el valor efectivo del salario por hora de trabajo del periodo es aproximadamente **COP 9.620,36**.

La conversión de Codex usa la TRM de COP 3.158,43 por USD vigente el 26 de octubre de 2026. La tarjeta, impuestos o variación cambiaria pueden modificar el valor facturado. Si se pudiera prorratear exactamente el mes y medio de Codex, serían USD 150 (≈ COP 473.765), y el total aritmético sería **COP 3.100.123**; el presupuesto principal reserva dos cobros mensuales completos.

El auxilio de transporte de 2026 es COP 249.095 mensuales para quien cumpla las condiciones. Si aplica durante el mes y medio, agregaría aproximadamente **COP 373.643**, para un total directo de **COP 3.631.687**. El presupuesto no suma aportes del empleador, prestaciones, vacaciones, impuestos ni costos administrativos de contratación; el costo de nómina formal debe liquidarse según la modalidad contractual y las condiciones del empleador.

## Qué cubre el plazo de seis semanas

Con aproximadamente 273 horas efectivas y Codex como apoyo, el alcance razonable es un **piloto priorizado sobre el prototipo existente**: fortalecer reglas de recepción, existencias, seriales, asignaciones, mantenimiento y trazabilidad; pulir validaciones; y cerrar una lista acordada de criterios de aceptación para demostración o piloto controlado.

Este escenario **no alcanza para entregar toda la arquitectura de microservicios al 100% en producción**. No incluye construir y desplegar todos los servicios independientes, identidad empresarial, API Gateway productiva, bases por servicio, RabbitMQ, integración con ERP/SSO, migraciones complejas, observabilidad, pruebas de carga, soporte ni garantías operativas. Dos modelos aceleran tareas y revisiones, pero no reemplazan una persona adicional para ejecutar, verificar y operar esos componentes.

Para este plazo, “funcional” debe significar que los flujos del piloto acordados pasan sus criterios de aceptación en un ambiente de prueba. Si el objetivo sigue siendo toda la plataforma productiva, el plazo de seis semanas y este presupuesto no son suficientes.

## Costos de Codex y uso de modelos

OpenAI lista Codex dentro de sus planes ChatGPT: Plus aparece a USD 20/mes con uso enfocado, y Pro a USD 100/mes con límites superiores para jornadas intensivas. Esta estimación usa **una cuenta Pro** para un solo usuario y dos modelos; no compra dos asientos. Si los modelos se llaman por API, el costo cambia a facturación por tokens y debe calcularse con el consumo real; no está incluido aquí.

## Referencias consultadas

- [Decreto 1469 de 2025 en el normograma de la Procuraduría](https://apps.procuraduria.gov.co/normograma/compilacion/docs/decreto_1469_2025.htm): fija el salario mínimo mensual de 2026 en COP 1.750.905.
- [Circular 101 de 2025 del Ministerio del Trabajo, alojada en el normograma de CRC](https://normograma.crcom.gov.co/crc/compilacion/docs/circular_mintra_0101_2025.htm): recoge la reducción a 42 horas desde el 15 de julio de 2026 y el divisor de 210 horas al mes para el cálculo de hora ordinaria.
- [OpenAI Codex: planes y precios](https://openai.com/codex/): muestra Codex incluido en los planes ChatGPT y las tarifas mensuales consultadas para Plus y Pro.
- [TRM histórica en datos.gov.co, fuente Superintendencia Financiera](https://www.datos.gov.co/Econom-a-y-Finanzas/Tasa-de-Cambio-Representativa-del-Mercado-Historic/mcec-87by/data_preview): COP 3.158,43 por USD para la vigencia del 26 de octubre de 2026.
- [Multiplier — salarios y costos de contratación en Colombia 2026](https://www.usemultiplier.com/columbia/cost-of-employment): contexto salarial agregado; sus rangos publicados para desarrollo de software superan el salario mínimo y no son una cotización de proyecto.
